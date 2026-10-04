// The daily campaign tick. Order matters: AI planning → schedules → ads → money → decay →
// economy → events → debates → early voting → polls → snapshot/forecast.

import { STATES } from '../data/states';
import { ISSUE_IDS } from '../data/issues';
import { PARTIES } from '../data/parties';
import { TUNING } from './config';
import type { DebateApproach, GameState } from './types';
import { createRng, withRng, type Rng } from './rng';
import { clamp } from './util';
import { computeSnapshot, leaderOf, type Snapshot } from './voterModel';
import { executeAction, processAds } from './actions';
import { planDay, rankTargets, runAi } from './ai';
import { stepEconomy } from './economy';
import { rollDailyEvent, resolvePendingEvent } from './events';
import { autoDebate, finishDebate, playRound, startDebate, aiApproach, DEBATE_ROUNDS } from './debate';
import { bankEarlyVotes, computeElection } from './election';
import { releasePolls } from './polls';
import { runForecast } from './forecast';
import { pushNews } from './news';

/** Is the game waiting on a player decision? */
export function isBlocked(game: GameState): boolean {
  return !!game.pendingEvent || !!game.liveDebate || game.phase !== 'campaign';
}

function decayAll(game: GameState) {
  for (const code of Object.keys(game.states)) {
    const rt = game.states[code];
    for (const id of Object.keys(rt.presence)) rt.presence[id] *= TUNING.presenceDecay;
    for (const id of Object.keys(rt.ads)) rt.ads[id] *= TUNING.adDecay;
    for (const id of Object.keys(rt.attacks)) rt.attacks[id] *= TUNING.adDecay;
    for (const id of Object.keys(rt.eventMod)) rt.eventMod[id] *= TUNING.eventModDecay;
  }
  for (const id of ISSUE_IDS) game.salienceShock[id] *= TUNING.salienceShockDecay;
  for (const c of game.candidates) {
    c.momentum = clamp(c.momentum * TUNING.momentumDecay, -1, 1);
    c.favorability *= TUNING.favorabilityReversion;
    c.stamina = clamp(c.stamina + 4, 0, 100);
    // Enthusiasm drifts toward a level set by momentum and image.
    const target = (PARTIES[c.party].brandPenalty > 0 ? 46 : 54) + c.momentum * 40 + c.favorability * 0.25;
    c.enthusiasm = clamp(c.enthusiasm + (target - c.enthusiasm) * 0.03, 5, 98);
  }
}

function dailyIncome(game: GameState) {
  for (const c of game.candidates) {
    const party = PARTIES[c.party];
    const income = party.dailyIncome * (0.6 + c.stats.fundraising / 125) * (1 + clamp(c.momentum, -0.6, 1) * 0.5);
    c.funds += Math.max(0.02, income);
    c.totals.raised += Math.max(0.02, income);
  }
}

function recordSnapshot(game: GameState, snap: Snapshot) {
  game.forecast = runForecast(game, snap);
  const stateEst: Record<string, number[]> = {};
  for (const s of STATES) stateEst[s.code] = game.candidates.map((c) => Math.round(snap.states[s.code].estimate[c.id] * 1000) / 1000);
  const entry = {
    day: game.day,
    national: { ...snap.national },
    undecided: snap.undecided,
    ev: { ...snap.projectedEv },
    winProb: { ...game.forecast.winProb },
    stateEst,
  };
  const last = game.history[game.history.length - 1];
  if (last && last.day === game.day) game.history[game.history.length - 1] = entry;
  else game.history.push(entry);
}

/** Recompute polls/forecast/history without advancing time (used at start and after decisions). */
export function refreshDerived(game: GameState, opts: { initialPolls?: boolean } = {}) {
  const snap = computeSnapshot(game);
  if (opts.initialPolls) withRng(game, (rng) => releasePolls(game, snap, rng, { national: 3, states: 10 }));
  recordSnapshot(game, snap);
}

function runDebateIfDue(game: GameState, rng: Rng) {
  const slot = game.debates.find((d) => !d.done && d.day === game.day);
  if (!slot) return;
  const participants = startDebate(game, slot, rng);
  if (game.playerId && participants.participants.includes(game.playerId)) {
    game.liveDebate = participants;
    pushNews(game, `Dziś wieczorem: ${slot.title}`, { tone: 'breaking', category: 'debate' });
  } else {
    autoDebate(game, slot, rng);
  }
}

/** Advance the campaign by one day. No-op while the game is blocked on a decision. */
export function advanceDay(game: GameState) {
  if (isBlocked(game)) return;
  const rng = createRng(game.rng);
  game.day += 1;
  const daysLeft = game.settings.totalDays - game.day;

  let snap = computeSnapshot(game);
  for (const c of game.candidates) {
    if (!c.isPlayer) runAi(game, c, snap, rng);
    else if (c.autopilot && c.schedule.length === 0) planDay(game, c, snap, rankTargets(c, snap), rng);
  }
  for (const c of game.candidates) {
    const action = c.schedule.shift();
    if (action) executeAction(game, c, action, rng);
    else c.stamina = clamp(c.stamina + 3, 0, 100); // an idle day is a light rest
  }
  processAds(game);
  dailyIncome(game);
  decayAll(game);
  stepEconomy(game, rng);
  rollDailyEvent(game, rng);
  runDebateIfDue(game, rng);

  snap = computeSnapshot(game);
  if (daysLeft < TUNING.earlyVotingDays) {
    if (daysLeft === TUNING.earlyVotingDays - 1) pushNews(game, 'Rusza głosowanie przedterminowe i korespondencyjne w większości stanów', { tone: 'breaking', category: 'campaign' });
    bankEarlyVotes(game, snap);
  }
  releasePolls(game, snap, rng);
  recordSnapshot(game, snap);
  milestoneNews(game, snap);

  if (game.day >= game.settings.totalDays) {
    game.phase = 'election';
    game.pendingEvent = null;
    game.liveDebate = null;
    game.result = computeElection(game, rng);
  }
  game.rng = rng.state();
}

function milestoneNews(game: GameState, snap: Snapshot) {
  if (game.day % 10 !== 0) return;
  const lead = leaderOf(snap.national);
  const c = game.candidates.find((x) => x.id === lead.id)!;
  pushNews(game, `Średnia sondaży: ${c.name} prowadzi o ${(lead.margin * 100).toFixed(1)} pkt proc.`, { category: 'polls', candId: c.id });
}

// ---- player decisions that need the RNG ----

export function chooseEventOption(game: GameState, choice: number) {
  withRng(game, (rng) => resolvePendingEvent(game, choice, rng));
  refreshDerived(game);
}

export function playDebateRound(game: GameState, approach: DebateApproach) {
  const live = game.liveDebate;
  if (!live || !game.playerId) return;
  withRng(game, (rng) => {
    const picks: Record<string, DebateApproach> = {};
    for (const id of live.participants) picks[id] = id === game.playerId ? approach : aiApproach(game, id, live.topics[live.round], rng);
    playRound(game, live, picks, rng);
  });
}

export function concludeDebate(game: GameState) {
  const live = game.liveDebate;
  if (!live || live.round < DEBATE_ROUNDS) return;
  finishDebate(game, live);
  game.liveDebate = null;
  refreshDerived(game);
}

/** Fast-forward to the end of the campaign (spectator mode / tests). AI resolves player blocks. */
export function simulateToEnd(game: GameState) {
  let guard = 0;
  while (game.phase === 'campaign' && guard++ < 1000) {
    if (game.pendingEvent) chooseEventOption(game, 0);
    if (game.liveDebate) {
      while (game.liveDebate.round < DEBATE_ROUNDS) playDebateRound(game, 'facts');
      concludeDebate(game);
    }
    advanceDay(game);
  }
}
