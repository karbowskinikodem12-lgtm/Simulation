// The daily campaign tick. Order matters: AI planning → schedules → ads → money → decay →
// economy → events → debates → early voting → polls → snapshot/forecast.

import { STATES } from '../data/states';
import { ISSUE_IDS } from '../data/issues';
import { PARTIES } from '../data/parties';
import { TUNING } from './config';
import type { DebateApproach, DebateStrategy, GameState } from './types';
import { createRng, withRng, type Rng } from './rng';
import { clamp } from './util';
import { computeSnapshot, leaderOf, type Snapshot } from './voterModel';
import { earn, executeAction, processAds, spend } from './actions';
import { planDay, rankTargets, runAi } from './ai';
import { stepEconomy } from './economy';
import { fireScheduled, rollDailyEvent, resolvePendingEvent } from './events';
import { autoDebate, finishDebate, playRound, startDebate, aiApproach, aiStrategy, DEBATE_ROUNDS } from './debate';
import { stepSocial } from './social';
import { bankEarlyVotes, computeElection } from './election';
import { releasePolls } from './polls';
import { runForecast } from './forecast';
import { pushNews } from './news';
import { bi, L } from '../i18n';

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
    for (const id of Object.keys(rt.digital)) rt.digital[id] *= 0.86;
    for (const id of Object.keys(rt.canvass)) rt.canvass[id] *= 0.965;
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

/** Donations by source and the fixed cost of running a national campaign. */
function dailyMoney(game: GameState) {
  for (const c of game.candidates) {
    const party = PARTIES[c.party];
    const winProb = game.forecast?.winProb[c.id] ?? 0.3;
    const small =
      party.dailyIncome * 0.45 * (0.5 + c.stats.grassroots / 100) * (1 + 0.6 * c.social.buzz + 0.4 * clamp(c.momentum, -0.6, 1)) * (0.7 + (Math.min(c.social.followers, 60) / 60) * 0.6);
    const major = party.dailyIncome * 0.45 * (0.5 + c.stats.fundraising / 100) * (0.7 + winProb * 0.6);
    earn(c, Math.max(0.01, small), 'small');
    earn(c, Math.max(0.01, major), 'major');
    if (party.brandPenalty === 0 && game.day % 7 === 0) earn(c, party.dailyIncome * 7 * 0.12, 'party');
    let offices = 0;
    for (const s of STATES) offices += game.states[s.code].offices[c.id] ?? 0;
    spend(c, 0.05 + party.dailyIncome * 0.07 + offices * 0.004, 'staff');
  }
}

/** Rising in the polls breeds momentum ("bandwagon"), sliding erodes it. */
function pollMomentum(game: GameState) {
  const h = game.history;
  if (h.length < 8) return;
  const now = h[h.length - 1];
  const then = h[h.length - 8];
  for (const c of game.candidates) {
    const trend = (now.national[c.id] - then.national[c.id]) * (1 - now.undecided);
    c.momentum = clamp(c.momentum + clamp(trend, -0.05, 0.05) * 0.2, -1, 1);
  }
}

const CAL = (kind: string, id: string) => `cal:${kind}:${id}`;

/** Calendar events: running mate picks, primary unity, conventions. Deferred if a decision is pending. */
function runCalendar(game: GameState, rng: Rng) {
  const T = game.settings.totalDays;
  const due: [string, string][] = [];
  game.candidates.forEach((c, i) => {
    if (game.day >= Math.round(T * 0.07) + i && !game.cooldowns[CAL('vp', c.id)]) due.push(['vp_pick', c.id]);
    if (PARTIES[c.party].brandPenalty === 0 && game.day >= Math.round(T * 0.12) + i && !game.cooldowns[CAL('primary', c.id)]) due.push(['primary_unity', c.id]);
  });
  for (const conv of game.conventions) if (!conv.done && game.day >= conv.day) due.push(['convention', conv.candId]);
  for (const [tpl, candId] of due) {
    if (game.pendingEvent) return;
    if (tpl === 'vp_pick') game.cooldowns[CAL('vp', candId)] = 1;
    if (tpl === 'primary_unity') game.cooldowns[CAL('primary', candId)] = 1;
    if (tpl === 'convention') {
      game.conventions.find((x) => x.candId === candId)!.done = true;
      const c = game.candidates.find((x) => x.id === candId)!;
      c.momentum += 0.05; // the classic convention bounce, on top of the chosen message
      c.enthusiasm = clamp(c.enthusiasm + 2, 0, 100);
    }
    fireScheduled(game, tpl, candId, rng);
  }
}

function stepInterest(game: GameState) {
  const p = game.day / game.settings.totalDays;
  const target = 42 + p * 42;
  game.interest = clamp(game.interest + (target - game.interest) * 0.05, 10, 100);
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
    funds: Object.fromEntries(game.candidates.map((c) => [c.id, Math.round(c.funds * 10) / 10])),
    momentum: Object.fromEntries(game.candidates.map((c) => [c.id, Math.round(c.momentum * 1000) / 1000])),
    buzz: Object.fromEntries(game.candidates.map((c) => [c.id, Math.round(c.social.buzz * 1000) / 1000])),
    turnout: snap.turnout,
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
    pushNews(game, bi((l) => `${l === 'pl' ? 'Dziś wieczorem' : 'Tonight'}: ${slot.title[l]}`), { tone: 'breaking', category: 'debate' });
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
  dailyMoney(game);
  decayAll(game);
  stepEconomy(game, rng);
  stepSocial(game, rng);
  stepInterest(game);
  pollMomentum(game);
  runCalendar(game, rng);
  rollDailyEvent(game, rng);
  runDebateIfDue(game, rng);

  snap = computeSnapshot(game);
  if (daysLeft < TUNING.earlyVotingDays) {
    if (daysLeft === TUNING.earlyVotingDays - 1) pushNews(game, L('Rusza głosowanie przedterminowe i korespondencyjne w większości stanów', 'Early in-person and mail voting begins in most states'), { tone: 'breaking', category: 'campaign' });
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
  const m = (lead.margin * 100).toFixed(1);
  pushNews(game, L(`Średnia sondaży: ${c.name} prowadzi o ${m} pkt proc.`, `Polling average: ${c.name} leads by ${m} points`), { category: 'polls', candId: c.id });
}

// ---- player decisions that need the RNG ----

export function chooseEventOption(game: GameState, choice: number) {
  withRng(game, (rng) => resolvePendingEvent(game, choice, rng));
  refreshDerived(game);
}

export function chooseDebateStrategy(game: GameState, strategy: DebateStrategy) {
  const live = game.liveDebate;
  if (!live || !game.playerId || live.stage !== 'strategy') return;
  live.strategies[game.playerId] = strategy;
  live.stage = 'rounds';
}

export function playDebateRound(game: GameState, approach: DebateApproach) {
  const live = game.liveDebate;
  if (!live || !game.playerId || live.stage !== 'rounds' || live.round >= DEBATE_ROUNDS) return;
  withRng(game, (rng) => {
    const picks: Record<string, DebateApproach> = {};
    for (const id of live.participants) picks[id] = id === game.playerId ? approach : aiApproach(game, id, live.topics[live.round], rng, live.strategies[id]);
    playRound(game, live, picks, rng);
  });
}

/** After the last round: apply results and show the report; called again to close the report. */
export function concludeDebate(game: GameState) {
  const live = game.liveDebate;
  if (!live) return;
  if (live.stage === 'rounds' && live.round >= DEBATE_ROUNDS) {
    withRng(game, (rng) => finishDebate(game, live, rng));
    refreshDerived(game);
  } else if (live.stage === 'report') {
    game.liveDebate = null;
  }
}

/** Fast-forward to the end of the campaign (spectator mode / tests). AI resolves player blocks. */
export function simulateToEnd(game: GameState) {
  let guard = 0;
  while (game.phase === 'campaign' && guard++ < 1000) {
    if (game.pendingEvent) chooseEventOption(game, 0);
    if (game.liveDebate) {
      const live = game.liveDebate;
      if (live.stage === 'strategy') withRng(game, (rng) => chooseDebateStrategy(game, aiStrategy(game, game.playerId!, rng)));
      while (live.round < DEBATE_ROUNDS) playDebateRound(game, 'facts');
      concludeDebate(game);
      concludeDebate(game);
    }
    advanceDay(game);
  }
}
