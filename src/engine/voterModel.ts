// Voter model: every voter segment in every state evaluates each candidate with a utility built
// from partisanship, policy distance on the issues that segment cares about, candidate quality,
// momentum, the economy, campaign effort and social media. Shares come from a multinomial logit
// (softmax), weighted by who actually turns out.

import { STATES, STATE_BY_CODE, stateIssueBias, stateIssueWeight, type StateInfo } from '../data/states';
import { ISSUES, ISSUE_IDS } from '../data/issues';
import { PARTIES } from '../data/parties';
import { TUNING } from './config';
import type { Economy, GameState, GroupId, GroupResult, IssueId } from './types';
import { GROUP_IDS, SEGMENTS } from './groups';
import { clamp } from './util';

export type FactorKey = 'partisan' | 'issues' | 'quality' | 'favor' | 'momentum' | 'economy' | 'effort' | 'social' | 'home' | 'local' | 'brand';

export const FACTOR_LABEL: Record<FactorKey, string> = {
  partisan: 'Lojalność partyjna',
  issues: 'Program i tematy',
  quality: 'Doświadczenie i charyzma',
  favor: 'Wizerunek (favorability)',
  momentum: 'Momentum medialne',
  economy: 'Gospodarka i ocena administracji',
  effort: 'Kampania w terenie i reklamy',
  social: 'Media społecznościowe',
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
  turnout: number; // projected turnout (fraction of VEP)
  groups: Record<GroupId, GroupResult>; // true group results
  groupsEst: Record<GroupId, Record<string, number>>; // polled group results
}

export interface Snapshot {
  states: Record<string, StateSupport>;
  national: Record<string, number>; // estimated decided share
  nationalTrue: Record<string, number>;
  undecided: number;
  projectedEv: Record<string, number>;
  salience: Record<IssueId, number>;
  turnout: number;
  groups: Record<GroupId, GroupResult>;
  groupsEst: Record<GroupId, Record<string, number>>;
}

export function economyIndex(e: Economy): number {
  const raw = (e.gdp - 2) / 2.5 - (e.inflation - 2.8) / 2.6 - (e.unemployment - 4.3) / 2 - ((e.gas - 3.4) / 2.5) * 0.5 - ((e.rate - 4) / 3) * 0.4 + ((e.stocks - 5000) / 1000) * 0.3;
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

export function undecidedShare(game: GameState, s: StateInfo): number {
  const p = progress(game);
  const base = TUNING.undecidedStart + (TUNING.undecidedEnd - TUNING.undecidedStart) * Math.pow(p, 0.9);
  return base * (0.7 + 0.6 * Math.exp(-Math.abs(s.lean) * 6));
}

/** Incumbent-party effect from administration approval (-1..1). */
export function approvalTerm(game: GameState): number {
  return clamp((game.approval - 46) / 14, -1, 1);
}

/** Turnout multiplier from public interest in the election. */
export function interestFactor(game: GameState): number {
  return 0.88 + (game.interest / 100) * 0.15;
}

const FACTOR_KEYS = Object.keys(FACTOR_LABEL) as FactorKey[];

function emptyGroupAcc(n: number) {
  const out = {} as Record<GroupId, { size: number; votes: number[]; est: number[] }>;
  for (const g of GROUP_IDS) out[g] = { size: 0, votes: new Array(n).fill(0), est: new Array(n).fill(0) };
  return out;
}

/**
 * Support in one state. Each of the 18 segments (split into partisans and independents) picks
 * candidates via softmax over utilities; then each candidate's supporters turn out at a rate set
 * by the segment's propensity, the candidate's enthusiasm and ground game. Shares are therefore
 * "likely voter" shares — who actually votes matters as much as who people prefer.
 */
export function computeStateSupport(game: GameState, s: StateInfo, sal: Record<IssueId, number>, incTerm: number): StateSupport {
  const cands = game.candidates;
  const n = cands.length;
  const ids = cands.map((c) => c.id);
  const rt = game.states[s.code];
  const nat = game.states.__national;
  const ssal = stateSalience(s.code, sal);
  const ideals = IDEALS[s.code];
  const errScale = 1 - 0.45 * progress(game);
  const err = game.pollingError[s.code] ?? {};
  const errArr = ids.map((id) => (err[id] ?? 0) * errScale);
  const turnoutBase = s.turnout * interestFactor(game);

  // Candidate-level terms shared by all segments of the state.
  const axisId: number[] = [];
  const base: number[] = [];
  const resp: number[] = [];
  const pres: number[] = [];
  const tv: number[] = [];
  const dig: number[] = [];
  const off: number[] = [];
  const canv: number[] = [];
  const atk: number[] = [];
  const buzz: number[] = [];
  const mob: number[] = [];
  const parts: { quality: number; favor: number; momentum: number; economy: number; home: number; local: number; brand: number }[] = [];
  cands.forEach((c, i) => {
    const party = PARTIES[c.party];
    axisId[i] = party.axis * party.identity * TUNING.partisanWeight;
    const quality = (c.stats.charisma - 50 + (c.stats.experience - 50) * 0.7) * TUNING.qualityWeight;
    const favor = c.favorability * TUNING.favorabilityWeight;
    const momentum = c.momentum * TUNING.momentumWeight;
    const economy = game.settings.incumbentParty === c.party ? incTerm * TUNING.economyWeight : 0;
    const home = c.homeState === s.code ? TUNING.homeStateBonus : STATE_BY_CODE[c.homeState]?.region === s.region ? TUNING.homeRegionBonus : 0;
    const local = rt.eventMod[c.id] ?? 0;
    const brand = -party.brandPenalty;
    parts[i] = { quality, favor, momentum, economy, home, local, brand };
    base[i] = quality + home + local + brand;
    resp[i] = favor + momentum + economy;
    pres[i] = rt.presence[c.id] ?? 0;
    tv[i] = (rt.ads[c.id] ?? 0) + (nat?.ads[c.id] ?? 0) * TUNING.nationalAdSpill;
    dig[i] = (rt.digital[c.id] ?? 0) + (nat?.digital[c.id] ?? 0) * TUNING.nationalAdSpill;
    off[i] = rt.offices[c.id] ?? 0;
    canv[i] = rt.canvass[c.id] ?? 0;
    atk[i] = (rt.attacks[c.id] ?? 0) + (nat?.attacks[c.id] ?? 0) * TUNING.nationalAdSpill;
    buzz[i] = c.social.buzz;
    mob[i] = clamp((0.8 + (0.28 * c.enthusiasm) / 100) * (1 + 0.022 * off[i] + 0.05 * Math.log1p(canv[i]) + 0.015 * Math.log1p(pres[i])), 0.6, 1.4);
  });

  const votesT = new Array(n).fill(0);
  const votesE = new Array(n).fill(0);
  const compAcc = ids.map(() => Object.fromEntries(FACTOR_KEYS.map((k) => [k, 0])) as Record<FactorKey, number>);
  let compW = 0;
  const gAcc = emptyGroupAcc(n);
    const issues = new Array(n).fill(0);
  const effort = new Array(n).fill(0);
  const social = new Array(n).fill(0);
  const partisan = new Array(n).fill(0);
  const p = new Array(n).fill(0);
  const pe = new Array(n).fill(0);
  const idealArr = ISSUE_IDS.map((id) => ideals[id]);
  const posArr = cands.map((c) => ISSUE_IDS.map((id) => c.positions[id]));
  const nIss = ISSUE_IDS.length;
  const salArr = new Array(nIss).fill(0);

  for (const seg of SEGMENTS[s.code]) {
    let tot = 0;
    for (let k = 0; k < nIss; k++) {
      const id = ISSUE_IDS[k];
      salArr[k] = ssal[id] * seg.issueMult[id];
      tot += salArr[k];
    }
    const atanhLean = seg.atanhLean;
    for (let i = 0; i < n; i++) {
      const pos = posArr[i];
      let dist = 0;
      for (let k = 0; k < nIss; k++) dist += salArr[k] * Math.abs(pos[k] - (idealArr[k] + seg.idealOff[ISSUE_IDS[k]]));
      issues[i] = (-dist / tot / 100) * TUNING.issueWeight;
      effort[i] =
        TUNING.effortWeight * Math.log1p(pres[i] * seg.rally + tv[i] * seg.tv + dig[i] * seg.digital + off[i] * TUNING.officePresence * 0.6 + canv[i] * 0.25) -
        TUNING.attackWeight * Math.log1p(atk[i] * seg.tv);
      social[i] = TUNING.socialWeight * buzz[i] * seg.social;
      partisan[i] = axisId[i] * atanhLean;
    }
    const groups = seg.groups;
    for (let sub = 0; sub < 2; sub++) {
      const indep = sub === 1;
      const w = seg.weight * (indep ? seg.indep : 1 - seg.indep);
      // Inline softmax (true opinion and polled opinion) without allocations.
      let mx = -Infinity;
      for (let i = 0; i < n; i++) {
        p[i] = partisan[i] * (indep ? 0.25 : 1) + issues[i] * (indep ? 1.15 : 1) + resp[i] * (indep ? 1.35 : 1) + effort[i] + social[i] + base[i];
        if (p[i] > mx) mx = p[i];
      }
      let st = 0;
      let se = 0;
      for (let i = 0; i < n; i++) {
        pe[i] = Math.exp(p[i] + errArr[i] - mx);
        p[i] = Math.exp(p[i] - mx);
        st += p[i];
        se += pe[i];
      }
      for (let i = 0; i < n; i++) {
        p[i] /= st;
        pe[i] /= se;
      }
      let segVotes = 0;
      for (let i = 0; i < n; i++) {
        const youngBoost = seg.age === 'young' ? 1 + 0.06 * buzz[i] : 1;
        const turn = Math.min(0.97, turnoutBase * seg.turnout * mob[i] * youngBoost * (indep ? 0.88 : 1));
        const vT = w * p[i] * turn;
        const vE = w * pe[i] * turn;
        votesT[i] += vT;
        votesE[i] += vE;
        segVotes += vT;
        for (const [g, gw] of groups) {
          gAcc[g].votes[i] += vT * gw;
          gAcc[g].est[i] += vE * gw;
        }
        if (indep) {
          gAcc.independent.votes[i] += vT;
          gAcc.independent.est[i] += vE;
        }
      }
      for (const [g, gw] of groups) gAcc[g].size += w * gw;
      if (indep) gAcc.independent.size += w;
      // Factor decomposition, weighted by how many votes the sub-segment casts.
      compW += segVotes;
      for (let i = 0; i < n; i++) {
        const a = compAcc[i];
        a.partisan += partisan[i] * (indep ? 0.25 : 1) * segVotes;
        a.issues += issues[i] * (indep ? 1.15 : 1) * segVotes;
        const r = indep ? 1.35 : 1;
        a.favor += parts[i].favor * r * segVotes;
        a.momentum += parts[i].momentum * r * segVotes;
        a.economy += parts[i].economy * r * segVotes;
        a.effort += effort[i] * segVotes;
        a.social += social[i] * segVotes;
        a.quality += parts[i].quality * segVotes;
        a.home += parts[i].home * segVotes;
        a.local += parts[i].local * segVotes;
        a.brand += parts[i].brand * segVotes;
      }
    }
  }

  const sumT = votesT.reduce((a, b) => a + b, 0);
  const sumE = votesE.reduce((a, b) => a + b, 0);
  const shares: Record<string, number> = {};
  const estimate: Record<string, number> = {};
  const components: Record<string, Record<FactorKey, number>> = {};
  const utilities: Record<string, number> = {};
  ids.forEach((id, i) => {
    shares[id] = votesT[i] / sumT;
    estimate[id] = votesE[i] / sumE;
    const comp = {} as Record<FactorKey, number>;
    for (const k of FACTOR_KEYS) comp[k] = compAcc[i][k] / compW;
    components[id] = comp;
    utilities[id] = FACTOR_KEYS.reduce((a, k) => a + comp[k], 0);
  });
  const groups = {} as Record<GroupId, GroupResult>;
  const groupsEst = {} as Record<GroupId, Record<string, number>>;
  for (const g of GROUP_IDS) {
    const acc = gAcc[g];
    const gv = acc.votes.reduce((a, b) => a + b, 0);
    const ge = acc.est.reduce((a, b) => a + b, 0);
    groups[g] = { shares: Object.fromEntries(ids.map((id, i) => [id, acc.votes[i] / gv])), turnout: gv / acc.size, size: acc.size };
    groupsEst[g] = Object.fromEntries(ids.map((id, i) => [id, acc.est[i] / ge]));
  }
  return { code: s.code, utilities, components, shares, estimate, undecided: undecidedShare(game, s), turnout: sumT, groups, groupsEst };
}

export function computeSnapshot(game: GameState): Snapshot {
  const sal = nationalSalience(game);
  const inc = approvalTerm(game);
  const states: Record<string, StateSupport> = {};
  const national: Record<string, number> = {};
  const nationalTrue: Record<string, number> = {};
  const projectedEv: Record<string, number> = {};
  for (const c of game.candidates) {
    national[c.id] = 0;
    nationalTrue[c.id] = 0;
    projectedEv[c.id] = 0;
  }
  const gNat = {} as Record<GroupId, { votes: Record<string, number>; est: Record<string, number>; size: number; voters: number }>;
  for (const g of GROUP_IDS) gNat[g] = { votes: {}, est: {}, size: 0, voters: 0 };
  let totalW = 0;
  let totalVep = 0;
  let und = 0;
  for (const s of STATES) {
    const sup = computeStateSupport(game, s, sal, inc);
    states[s.code] = sup;
    const w = s.vep * sup.turnout;
    totalW += w;
    totalVep += s.vep;
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
    for (const g of GROUP_IDS) {
      const gr = sup.groups[g];
      const size = gr.size * s.vep;
      const voters = size * gr.turnout;
      const acc = gNat[g];
      acc.size += size;
      acc.voters += voters;
      for (const c of game.candidates) {
        acc.votes[c.id] = (acc.votes[c.id] ?? 0) + gr.shares[c.id] * voters;
        acc.est[c.id] = (acc.est[c.id] ?? 0) + sup.groupsEst[g][c.id] * voters;
      }
    }
  }
  for (const c of game.candidates) {
    national[c.id] /= totalW;
    nationalTrue[c.id] /= totalW;
  }
  const groups = {} as Record<GroupId, GroupResult>;
  const groupsEst = {} as Record<GroupId, Record<string, number>>;
  for (const g of GROUP_IDS) {
    const acc = gNat[g];
    groups[g] = { shares: Object.fromEntries(Object.entries(acc.votes).map(([k, v]) => [k, v / acc.voters])), turnout: acc.voters / acc.size, size: acc.size / totalVep };
    groupsEst[g] = Object.fromEntries(Object.entries(acc.est).map(([k, v]) => [k, v / acc.voters]));
  }
  return { states, national, nationalTrue, undecided: und / totalW, projectedEv, salience: sal, turnout: totalW / totalVep, groups, groupsEst };
}

export type RatingKey = 'safeD' | 'likelyD' | 'leanD' | 'tossup' | 'leanR' | 'likelyR' | 'safeR';

/** Cook-style rating from an estimate. Non-major parties are rated on the side of their axis. */
export function rateState(game: GameState, est: Record<string, number>): { key: RatingKey; label: string; leader: string; margin: number } {
  const l = leaderOf(est);
  const c = game.candidates.find((x) => x.id === l.id)!;
  const m = l.margin;
  if (m < 0.02) return { key: 'tossup', label: 'Toss-up', leader: l.id, margin: m };
  const right = PARTIES[c.party].axis > 0 || (PARTIES[c.party].axis === 0 && c.party !== 'DEM' && game.candidates.findIndex((x) => x.id === c.id) % 2 === 1);
  const side = right ? 'R' : 'D';
  const word = c.party === 'DEM' ? 'Democrat' : c.party === 'REP' ? 'Republican' : c.party === 'LIB' ? 'Libertarian' : c.party === 'GRN' ? 'Green' : 'Independent';
  const lvl = m < 0.06 ? 'lean' : m < 0.12 ? 'likely' : 'safe';
  const key = `${lvl}${side}` as RatingKey;
  const lvlLabel = lvl === 'lean' ? 'Lean' : lvl === 'likely' ? 'Likely' : 'Safe';
  return { key, label: `${lvlLabel} ${word}`, leader: l.id, margin: m };
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
