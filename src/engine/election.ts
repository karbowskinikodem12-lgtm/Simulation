// Election Day: early ballots already banked + Election-Day vote with turnout effects,
// small last-minute shocks, Electoral College allocation (incl. Maine/Nebraska districts) and
// a House contingent election when nobody reaches 270.

import { EV_TO_WIN, STATES, type StateInfo } from '../data/states';
import { PARTIES } from '../data/parties';
import { TUNING } from './config';
import type { Candidate, ElectionResult, GameState, StateResult } from './types';
import type { Rng } from './rng';
import { clamp } from './util';
import { computeSnapshot, type Snapshot } from './voterModel';
import { analyzeResult } from './analysis';

/** Turnout weight of a candidate's supporters in a state (enthusiasm + ground game). */
function turnoutWeight(game: GameState, c: Candidate, code: string): number {
  const offices = game.states[code].offices[c.id] ?? 0;
  return 0.82 + (c.enthusiasm / 100) * 0.36 + offices * 0.012;
}

function weightedShares(game: GameState, shares: Record<string, number>, code: string): Record<string, number> {
  const out: Record<string, number> = {};
  let total = 0;
  for (const c of game.candidates) {
    out[c.id] = shares[c.id] * turnoutWeight(game, c, code);
    total += out[c.id];
  }
  for (const id of Object.keys(out)) out[id] /= total;
  return out;
}

/** Bank one day of early votes at current true opinion. */
export function bankEarlyVotes(game: GameState, snap: Snapshot) {
  for (const s of STATES) {
    const daily = (s.vep * s.turnout * s.earlyVote) / TUNING.earlyVotingDays;
    const shares = weightedShares(game, snap.states[s.code].shares, s.code);
    const rt = game.states[s.code];
    for (const c of game.candidates) rt.banked[c.id] = (rt.banked[c.id] ?? 0) + daily * shares[c.id];
  }
}

export function bankedTotal(game: GameState): number {
  let t = 0;
  for (const s of STATES) for (const v of Object.values(game.states[s.code].banked)) t += v;
  return t;
}

function districtShares(game: GameState, s: StateInfo, shares: Record<string, number>, districtLean: number) {
  const shift = Math.atanh(clamp(districtLean, -0.9, 0.9)) - Math.atanh(clamp(s.lean, -0.9, 0.9));
  const out: Record<string, number> = {};
  let total = 0;
  for (const c of game.candidates) {
    const p = PARTIES[c.party];
    out[c.id] = shares[c.id] * Math.exp(p.axis * p.identity * TUNING.partisanWeight * shift);
    total += out[c.id];
  }
  for (const id of Object.keys(out)) out[id] /= total;
  return out;
}

function argmax(rec: Record<string, number>): string {
  return Object.entries(rec).sort((a, b) => b[1] - a[1])[0][0];
}

export function computeElection(game: GameState, rng: Rng): ElectionResult {
  const snap = computeSnapshot(game);
  const ids = game.candidates.map((c) => c.id);
  const nationalShock: Record<string, number> = Object.fromEntries(ids.map((id) => [id, rng.normal(0, 0.02)]));
  const avgEnthusiasm = game.candidates.reduce((a, c) => a + c.enthusiasm, 0) / game.candidates.length;

  const states: Record<string, StateResult> = {};
  const popular: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  const ev: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  let totalVotes = 0;
  let totalVep = 0;

  for (const s of STATES) {
    const sup = snap.states[s.code];
    // Undecided voters break with small random noise around current opinion.
    const logits = ids.map((id) => Math.log(sup.shares[id]) + nationalShock[id] + rng.normal(0, 0.03));
    const m = Math.max(...logits);
    const ex = logits.map((l) => Math.exp(l - m));
    const tot = ex.reduce((a, b) => a + b, 0);
    const finalOpinion: Record<string, number> = {};
    ids.forEach((id, i) => (finalOpinion[id] = ex[i] / tot));
    const edayShares = weightedShares(game, finalOpinion, s.code);

    const sorted = Object.values(finalOpinion).sort((a, b) => b - a);
    const closeness = Math.exp(-(sorted[0] - sorted[1]) * 12);
    const turnout = clamp(s.turnout * (0.88 + (avgEnthusiasm / 100) * 0.14) + closeness * 0.025 + rng.normal(0, 0.012), 0.38, 0.9);
    const total = s.vep * turnout;
    const rt = game.states[s.code];
    const banked = ids.reduce((a, id) => a + (rt.banked[id] ?? 0), 0);
    const remaining = Math.max(0, total - banked);

    const votes: Record<string, number> = {};
    for (const id of ids) votes[id] = (rt.banked[id] ?? 0) + remaining * edayShares[id];
    const cast = ids.reduce((a, id) => a + votes[id], 0);
    const shares: Record<string, number> = {};
    for (const id of ids) shares[id] = votes[id] / cast;
    const winner = argmax(shares);

    const evAward: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
    if (s.districts) {
      evAward[winner] += 2;
      for (const d of s.districts) evAward[argmax(districtShares(game, s, shares, d.lean))] += 1;
    } else evAward[winner] += s.ev;

    for (const id of ids) {
      popular[id] += votes[id];
      ev[id] += evAward[id];
    }
    totalVotes += cast;
    totalVep += s.vep;
    states[s.code] = { code: s.code, votes, shares, turnout: cast / s.vep, totalVotes: cast, winner, ev: evAward, earlyShare: banked / cast };
  }

  const popularShare: Record<string, number> = {};
  for (const id of ids) popularShare[id] = popular[id] / totalVotes;

  let winner = ids.find((id) => ev[id] >= EV_TO_WIN);
  let contingent = false;
  if (!winner) {
    // 12th Amendment: the House picks among the top three, one vote per state delegation.
    // Delegations are approximated by the state's popular-vote winner.
    contingent = true;
    const delegations: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
    for (const s of STATES) if (s.code !== 'DC') delegations[states[s.code].winner] += 1;
    winner = argmax(delegations);
  }

  const result: ElectionResult = {
    states,
    popular,
    popularShare,
    ev,
    winner,
    contingent,
    turnout: totalVotes / totalVep,
    totalVotes,
    analysis: { headline: '', reasons: [], caveats: [], factors: [] },
  };
  result.analysis = analyzeResult(game, result, snap);
  return result;
}
