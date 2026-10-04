// Voter model: every state's electorate evaluates each candidate with a utility built from
// partisanship, policy distance on salient issues, candidate quality, momentum, economy and
// campaign effort. Shares come from a multinomial logit (softmax) over utilities.

import { STATES, STATE_BY_CODE, stateIssueBias, stateIssueWeight, type StateInfo } from '../data/states';
import { ISSUES, ISSUE_IDS } from '../data/issues';
import { PARTIES } from '../data/parties';
import { TUNING } from './config';
import type { Candidate, Economy, GameState, IssueId } from './types';
import { clamp, softmax } from './util';

export type FactorKey = 'partisan' | 'issues' | 'quality' | 'favor' | 'momentum' | 'economy' | 'effort' | 'home' | 'local' | 'brand';

export const FACTOR_LABEL: Record<FactorKey, string> = {
  partisan: 'Lojalność partyjna',
  issues: 'Program i tematy',
  quality: 'Doświadczenie i charyzma',
  favor: 'Wizerunek (favorability)',
  momentum: 'Momentum medialne',
  economy: 'Ocena gospodarki',
  effort: 'Kampania w terenie i reklamy',
  home: 'Stan rodzinny',
  local: 'Wydarzenia lokalne',
  brand: 'Bariera trzeciej partii',
};

export interface StateSupport {
  code: string;
  utilities: Record<string, number>;
  components: Record<string, Record<FactorKey, number>>;
  shares: Record<string, number>; // true decided shares (sum 1)
  estimate: Record<string, number>; // what pollsters / the public see (sum 1)
  undecided: number;
}

export interface Snapshot {
  states: Record<string, StateSupport>;
  national: Record<string, number>; // estimated decided share
  nationalTrue: Record<string, number>;
  undecided: number;
  projectedEv: Record<string, number>;
  salience: Record<IssueId, number>;
}

export function economyIndex(e: Economy): number {
  const raw = (e.gdp - 2) / 2.5 - (e.inflation - 2.8) / 2.6 - (e.unemployment - 4.3) / 2 - ((e.gas - 3.4) / 2.5) * 0.5;
  return clamp(raw / 2.5, -1, 1);
}

/** National issue salience: baseline, economic conditions and news shocks; normalised to sum 1. */
export function nationalSalience(game: GameState): Record<IssueId, number> {
  const e = game.economy;
  const raw = {} as Record<IssueId, number>;
  for (const id of ISSUE_IDS) {
    let v = game.baseSalience[id];
    if (id === 'inflation') v *= 1 + Math.max(0, e.inflation - 2.5) * 0.22 + Math.max(0, e.gas - 3.5) * 0.15;
    if (id === 'jobs') v *= 1 + Math.max(0, e.unemployment - 4.2) * 0.3;
    if (id === 'economy') v *= 1 + Math.max(0, 2 - e.gdp) * 0.15;
    raw[id] = Math.max(0.05, v + game.salienceShock[id]);
  }
  const total = ISSUE_IDS.reduce((a, id) => a + raw[id], 0);
  for (const id of ISSUE_IDS) raw[id] /= total;
  return raw;
}

export function stateIdeal(s: StateInfo, issue: IssueId): number {
  const center = ISSUES.find((i) => i.id === issue)!.center;
  return clamp(center + s.lean * TUNING.idealScale + stateIssueBias(s, issue), -100, 100);
}

/** Cached per-state constants (ideal points and issue weights). */
const IDEALS: Record<string, Record<IssueId, number>> = {};
const WEIGHTS: Record<string, Record<IssueId, number>> = {};
for (const s of STATES) {
  IDEALS[s.code] = {} as Record<IssueId, number>;
  WEIGHTS[s.code] = {} as Record<IssueId, number>;
  for (const id of ISSUE_IDS) {
    IDEALS[s.code][id] = stateIdeal(s, id);
    WEIGHTS[s.code][id] = stateIssueWeight(s, id);
  }
}

export function stateIdeals(code: string) {
  return IDEALS[code];
}

export function stateSalience(code: string, national: Record<IssueId, number>): Record<IssueId, number> {
  const w = WEIGHTS[code];
  const out = {} as Record<IssueId, number>;
  let total = 0;
  for (const id of ISSUE_IDS) {
    out[id] = national[id] * w[id];
    total += out[id];
  }
  for (const id of ISSUE_IDS) out[id] /= total;
  return out;
}

/** National median voter position, weighted by electorate size. */
export const NATIONAL_IDEAL: Record<IssueId, number> = (() => {
  const out = {} as Record<IssueId, number>;
  const totalW = STATES.reduce((a, s) => a + s.vep * s.turnout, 0);
  for (const id of ISSUE_IDS) out[id] = STATES.reduce((a, s) => a + IDEALS[s.code][id] * s.vep * s.turnout, 0) / totalW;
  return out;
})();

export function progress(game: GameState): number {
  return clamp(game.day / game.settings.totalDays, 0, 1);
}

function candidateComponents(game: GameState, c: Candidate, s: StateInfo, sal: Record<IssueId, number>, econ: number): Record<FactorKey, number> {
  const party = PARTIES[c.party];
  const rt = game.states[s.code];
  const lean = clamp(s.lean, -0.9, 0.9);

  const partisan = party.axis * party.identity * Math.atanh(lean) * TUNING.partisanWeight;

  let dist = 0;
  const ideals = IDEALS[s.code];
  for (const id of ISSUE_IDS) dist += sal[id] * Math.abs(c.positions[id] - ideals[id]);
  const issues = (-dist / 100) * TUNING.issueWeight;

  const quality = (c.stats.charisma - 50 + (c.stats.experience - 50) * 0.7) * TUNING.qualityWeight;
  const favor = c.favorability * TUNING.favorabilityWeight;
  const momentum = c.momentum * TUNING.momentumWeight;
  const economy = game.settings.incumbentParty === c.party ? econ * TUNING.economyWeight : 0;

  const nationalAds = game.states.__national?.ads[c.id] ?? 0;
  const effortStock =
    (rt.presence[c.id] ?? 0) + (rt.ads[c.id] ?? 0) + (rt.offices[c.id] ?? 0) * TUNING.officePresence + nationalAds * TUNING.nationalAdSpill;
  const attacked = (rt.attacks[c.id] ?? 0) + (game.states.__national?.attacks[c.id] ?? 0) * TUNING.nationalAdSpill;
  const effort = Math.log1p(effortStock) * TUNING.effortWeight - Math.log1p(attacked) * TUNING.attackWeight;

  const home = c.homeState === s.code ? TUNING.homeStateBonus : STATE_BY_CODE[c.homeState]?.region === s.region ? TUNING.homeRegionBonus : 0;
  const local = rt.eventMod[c.id] ?? 0;
  const brand = -party.brandPenalty;
  return { partisan, issues, quality, favor, momentum, economy, effort, home, local, brand };
}

export function undecidedShare(game: GameState, s: StateInfo): number {
  const p = progress(game);
  const base = TUNING.undecidedStart + (TUNING.undecidedEnd - TUNING.undecidedStart) * Math.pow(p, 0.9);
  return base * (0.7 + 0.6 * Math.exp(-Math.abs(s.lean) * 6));
}

export function computeStateSupport(game: GameState, s: StateInfo, sal: Record<IssueId, number>, econ: number): StateSupport {
  const ssal = stateSalience(s.code, sal);
  const utilities: Record<string, number> = {};
  const components: Record<string, Record<FactorKey, number>> = {};
  for (const c of game.candidates) {
    const comp = candidateComponents(game, c, s, ssal, econ);
    components[c.id] = comp;
    utilities[c.id] = Object.values(comp).reduce((a, b) => a + b, 0);
  }
  const ids = game.candidates.map((c) => c.id);
  const trueShares = softmax(ids.map((id) => utilities[id]));
  const errScale = 1 - 0.45 * progress(game);
  const err = game.pollingError[s.code] ?? {};
  const estShares = softmax(ids.map((id) => utilities[id] + (err[id] ?? 0) * errScale));
  const shares: Record<string, number> = {};
  const estimate: Record<string, number> = {};
  ids.forEach((id, i) => {
    shares[id] = trueShares[i];
    estimate[id] = estShares[i];
  });
  return { code: s.code, utilities, components, shares, estimate, undecided: undecidedShare(game, s) };
}

export function computeSnapshot(game: GameState): Snapshot {
  const sal = nationalSalience(game);
  const econ = economyIndex(game.economy);
  const states: Record<string, StateSupport> = {};
  const national: Record<string, number> = {};
  const nationalTrue: Record<string, number> = {};
  const projectedEv: Record<string, number> = {};
  for (const c of game.candidates) {
    national[c.id] = 0;
    nationalTrue[c.id] = 0;
    projectedEv[c.id] = 0;
  }
  let totalW = 0;
  let und = 0;
  for (const s of STATES) {
    const sup = computeStateSupport(game, s, sal, econ);
    states[s.code] = sup;
    const w = s.vep * s.turnout;
    totalW += w;
    und += sup.undecided * w;
    let best = '';
    let bestV = -1;
    for (const c of game.candidates) {
      national[c.id] += sup.estimate[c.id] * w;
      nationalTrue[c.id] += sup.shares[c.id] * w;
      if (sup.estimate[c.id] > bestV) {
        bestV = sup.estimate[c.id];
        best = c.id;
      }
    }
    projectedEv[best] += s.ev;
  }
  for (const c of game.candidates) {
    national[c.id] /= totalW;
    nationalTrue[c.id] /= totalW;
  }
  return { states, national, nationalTrue, undecided: und / totalW, projectedEv, salience: sal };
}

/** Margin (pp) of `candId` against the strongest rival in a state estimate. */
export function marginFor(sup: Record<string, number>, candId: string): number {
  let best = 0;
  for (const [id, v] of Object.entries(sup)) if (id !== candId) best = Math.max(best, v);
  return (sup[candId] ?? 0) - best;
}

export function leaderOf(sup: Record<string, number>): { id: string; margin: number } {
  const entries = Object.entries(sup).sort((a, b) => b[1] - a[1]);
  return { id: entries[0][0], margin: entries[0][1] - (entries[1]?.[1] ?? 0) };
}

/** National-median distance advantage of a candidate on one issue vs. rivals (-1..1). */
export function issueEdge(game: GameState, candId: string, issue: IssueId): number {
  const me = game.candidates.find((c) => c.id === candId)!;
  const myDist = Math.abs(me.positions[issue] - NATIONAL_IDEAL[issue]);
  const others = game.candidates.filter((c) => c.id !== candId);
  const otherDist = others.reduce((a, c) => a + Math.abs(c.positions[issue] - NATIONAL_IDEAL[issue]), 0) / Math.max(1, others.length);
  return clamp((otherDist - myDist) / 80, -1, 1);
}
