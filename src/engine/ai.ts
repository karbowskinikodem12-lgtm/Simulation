// Opponent campaign AI: allocates candidate time, ad money and field offices toward the states
// with the best ratio of electoral votes to competitiveness — like a real campaign manager.

import { DONOR_HUBS, STATES } from '../data/states';
import { ISSUE_IDS } from '../data/issues';
import { TUNING } from './config';
import type { Candidate, GameState, IssueId } from './types';
import type { Rng } from './rng';
import type { Snapshot } from './voterModel';
import { issueEdge, marginFor } from './voterModel';
import { addToSchedule, buyMedia, officeCost, openOffice, suggestedBudget, type MediaBuy } from './actions';
import { aiSocialStrategy } from './social';

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

/** Relative weights of daily activities by campaign style. */
const STYLE_MIX: Record<Candidate['style'], { rally: number; townhall: number; fundraiser: number; speech: number; interview: number; social: number }> = {
  aggressive: { rally: 0.5, townhall: 0.06, fundraiser: 0.14, speech: 0.08, interview: 0.12, social: 0.1 },
  establishment: { rally: 0.38, townhall: 0.12, fundraiser: 0.24, speech: 0.14, interview: 0.08, social: 0.04 },
  grassroots: { rally: 0.5, townhall: 0.2, fundraiser: 0.08, speech: 0.1, interview: 0.04, social: 0.08 },
  media: { rally: 0.36, townhall: 0.06, fundraiser: 0.14, speech: 0.08, interview: 0.16, social: 0.2 },
  balanced: { rally: 0.46, townhall: 0.12, fundraiser: 0.16, speech: 0.12, interview: 0.07, social: 0.07 },
};

export function planDay(game: GameState, c: Candidate, snap: Snapshot, targets: Target[], rng: Rng) {
  const nextDebate = game.debates.find((d) => !d.done && d.day >= game.day);
  const top = targets.slice(0, 6);
  const pickTarget = () => rng.weighted(top, (t) => t.value + 0.1).code;

  if (nextDebate && nextDebate.day - game.day <= 4 && c.debatePrep < 70 && rng.chance(0.7)) {
    addToSchedule(game, c.id, 'debatePrep');
  } else if (c.stamina < 28) {
    addToSchedule(game, c.id, 'rest');
  } else if (c.funds < 6 && rng.chance(0.7)) {
    addToSchedule(game, c.id, 'fundraiser', { state: rng.pick([...DONOR_HUBS]) });
  } else {
    const mix = STYLE_MIX[c.style];
    const kind = rng.weighted(Object.keys(mix) as (keyof typeof mix)[], (k) => mix[k]);
    if (kind === 'rally') addToSchedule(game, c.id, 'rally', { state: pickTarget() });
    else if (kind === 'townhall') addToSchedule(game, c.id, 'townhall', { state: pickTarget() });
    else if (kind === 'fundraiser') addToSchedule(game, c.id, 'fundraiser', { state: rng.pick([...DONOR_HUBS]) });
    else if (kind === 'speech') addToSchedule(game, c.id, 'speech', { issue: bestIssue(game, c, snap) });
    else if (kind === 'interview') addToSchedule(game, c.id, 'interview');
    else addToSchedule(game, c.id, 'socialBlitz');
  }
}

/** Weekly media and ground budget allocation, shaped by the candidate's style. */
function buyMediaPlan(game: GameState, c: Candidate, snap: Snapshot, targets: Target[], rng: Rng) {
  const reserve = 4;
  let budget = Math.max(0, (c.funds - reserve) * 0.6);
  if (budget < 1) return;
  const rival = mainRival(game, c, snap);
  const attackShare = c.style === 'aggressive' ? 0.5 : c.style === 'grassroots' ? 0.15 : 0.3;
  const digitalShare = c.style === 'media' ? 0.45 : c.style === 'grassroots' ? 0.3 : 0.2;
  const canvassShare = c.style === 'grassroots' ? 0.35 : c.style === 'establishment' ? 0.15 : 0.2;
  const buy = (b: MediaBuy) => {
    if (b.amount > budget || b.amount < 0.1) return;
    if (!buyMedia(game, c.id, b)) budget -= b.amount;
  };
  if (budget > 15 && rng.chance(0.4)) {
    const kind = rng.chance(attackShare) ? 'attack' : 'positive';
    buy({ channel: 'tv', scope: 'national', kind, amount: suggestedBudget('tv', 'national') * rng.range(0.8, 1.3), days: 7, targetId: kind === 'attack' ? rival : undefined });
  }
  if (budget > 4 && rng.chance(digitalShare + 0.2)) buy({ channel: 'digital', scope: 'national', kind: 'positive', amount: suggestedBudget('digital', 'national') * rng.range(0.8, 1.5), days: 7 });
  for (const t of targets.slice(0, 7)) {
    const roll = rng.next();
    const kind = roll < attackShare ? 'attack' : roll < attackShare + 0.15 ? 'issue' : 'positive';
    const channel = rng.chance(digitalShare) ? 'digital' : 'tv';
    // Spend more where the race is closest, but never go all-in on a single market.
    const scale = rng.range(0.8, 1.6) * (t.value > 5 ? 1.4 : 1);
    buy({ channel, scope: t.code, kind, amount: suggestedBudget(channel, t.code) * scale, days: 7, targetId: kind === 'attack' ? rival : undefined, issue: kind === 'issue' ? bestIssue(game, c, snap) : undefined });
    if (rng.chance(canvassShare) && game.day / game.settings.totalDays > 0.35) buy({ channel: 'canvass', scope: t.code, kind: 'positive', amount: suggestedBudget('canvass', t.code) * rng.range(0.8, 1.5), days: 7 });
  }
}

/** Daily AI turn. Called before schedules execute. */
export function runAi(game: GameState, c: Candidate, snap: Snapshot, rng: Rng) {
  const targets = rankTargets(c, snap);
  if (c.schedule.length === 0) planDay(game, c, snap, targets, rng);

  const idx = game.candidates.indexOf(c);
  if ((game.day + idx * 2) % 7 === 0) buyMediaPlan(game, c, snap, targets, rng);
  if (game.day % 10 === idx) c.social.strategy = aiSocialStrategy(c);

  const p = game.day / game.settings.totalDays;
  if (p < 0.6 && c.funds > 12 && rng.chance(0.18)) {
    const t = targets.slice(0, 8).find((x) => (game.states[x.code].offices[c.id] ?? 0) < (p < 0.3 ? 2 : TUNING.maxOffices) && officeCost(x.code) < c.funds * 0.15);
    if (t) openOffice(game, c.id, t.code);
  }
}
