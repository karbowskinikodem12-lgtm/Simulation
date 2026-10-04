// Opponent campaign AI: allocates candidate time, ad money and field offices toward the states
// with the best ratio of electoral votes to competitiveness — like a real campaign manager.

import { DONOR_HUBS, STATES } from '../data/states';
import { ISSUE_IDS } from '../data/issues';
import { TUNING } from './config';
import type { Candidate, GameState, IssueId } from './types';
import type { Rng } from './rng';
import type { Snapshot } from './voterModel';
import { issueEdge, marginFor } from './voterModel';
import { addToSchedule, adDailyCost, launchAd, officeCost, openOffice } from './actions';

export interface Target {
  code: string;
  value: number;
  margin: number;
}

/** Rank states by how much campaigning there is worth for a candidate. */
export function rankTargets(c: Candidate, snap: Snapshot): Target[] {
  return STATES.map((s) => {
    const margin = marginFor(snap.states[s.code].estimate, c.id);
    // Closeness peaks at a tied race; slightly favour states we trail narrowly (persuadable).
    const closeness = Math.exp(-Math.abs(margin + 0.01) / 0.05);
    const value = s.ev * closeness * (s.code === c.homeState ? 1.2 : 1);
    return { code: s.code, value, margin };
  }).sort((a, b) => b.value - a.value);
}

function bestIssue(game: GameState, c: Candidate, snap: Snapshot): IssueId {
  return [...ISSUE_IDS].sort((a, b) => issueEdge(game, c.id, b) * (0.5 + snap.salience[b] * 4) - issueEdge(game, c.id, a) * (0.5 + snap.salience[a] * 4))[0];
}

function mainRival(game: GameState, c: Candidate, snap: Snapshot): string {
  return game.candidates.filter((x) => x.id !== c.id).sort((a, b) => snap.national[b.id] - snap.national[a.id])[0].id;
}

export function planDay(game: GameState, c: Candidate, snap: Snapshot, targets: Target[], rng: Rng) {
  const nextDebate = game.debates.find((d) => !d.done && d.day >= game.day);
  const top = targets.slice(0, 6);
  const pickTarget = () => rng.weighted(top, (t) => t.value + 0.1).code;

  if (nextDebate && nextDebate.day - game.day <= 4 && c.debatePrep < 70 && rng.chance(0.7)) {
    addToSchedule(game, c.id, 'debatePrep');
  } else if (c.stamina < 28) {
    addToSchedule(game, c.id, 'rest');
  } else if (c.funds < 6 && rng.chance(0.7)) {
    const hub = rng.pick([...DONOR_HUBS]);
    addToSchedule(game, c.id, 'fundraiser', { state: hub });
  } else {
    const roll = rng.next();
    if (roll < 0.6) addToSchedule(game, c.id, 'rally', { state: pickTarget() });
    else if (roll < 0.72) addToSchedule(game, c.id, 'townhall', { state: pickTarget() });
    else if (roll < 0.84) addToSchedule(game, c.id, 'fundraiser', { state: rng.pick([...DONOR_HUBS]) });
    else if (roll < 0.94) addToSchedule(game, c.id, 'speech', { issue: bestIssue(game, c, snap) });
    else addToSchedule(game, c.id, 'interview');
  }
}

function buyAds(game: GameState, c: Candidate, snap: Snapshot, targets: Target[], rng: Rng) {
  const reserve = 4;
  let budget = Math.max(0, (c.funds - reserve) * 0.6);
  if (budget < 1) return;
  const rival = mainRival(game, c, snap);
  if (budget > 15 && rng.chance(0.45)) {
    const kind = rng.chance(0.35) ? 'attack' : 'positive';
    if (!launchAd(game, c.id, { scope: 'national', kind, days: 7, targetId: kind === 'attack' ? rival : undefined })) budget -= adDailyCost('national') * 7;
  }
  for (const t of targets.slice(0, 7)) {
    const cost = adDailyCost(t.code) * 7;
    if (cost > budget) continue;
    const roll = rng.next();
    const kind = roll < 0.3 ? 'attack' : roll < 0.45 ? 'issue' : 'positive';
    const err = launchAd(game, c.id, {
      scope: t.code,
      kind,
      days: 7,
      targetId: kind === 'attack' ? rival : undefined,
      issue: kind === 'issue' ? bestIssue(game, c, snap) : undefined,
    });
    if (!err) budget -= cost;
  }
}

/** Daily AI turn. Called before schedules execute. */
export function runAi(game: GameState, c: Candidate, snap: Snapshot, rng: Rng) {
  const targets = rankTargets(c, snap);
  if (c.schedule.length === 0) planDay(game, c, snap, targets, rng);

  const idx = game.candidates.indexOf(c);
  if ((game.day + idx * 2) % 7 === 0) buyAds(game, c, snap, targets, rng);

  const p = game.day / game.settings.totalDays;
  if (p < 0.6 && c.funds > 12 && rng.chance(0.18)) {
    const t = targets.slice(0, 8).find((x) => (game.states[x.code].offices[c.id] ?? 0) < (p < 0.3 ? 2 : TUNING.maxOffices) && officeCost(x.code) < c.funds * 0.15);
    if (t) openOffice(game, c.id, t.code);
  }
}
