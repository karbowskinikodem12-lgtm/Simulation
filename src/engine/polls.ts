// Pollsters sample the *estimated* electorate (true opinion + systemic polling error) with
// sampling noise and house effects. The public — and the player — only ever see polls.

import { STATES, stateName } from '../data/states';
import { L, type LStr } from '../i18n';
import { PARTIES } from '../data/parties';
import type { GameState, Poll } from './types';
import type { Rng } from './rng';
import type { Snapshot } from './voterModel';
import { nextId } from './news';
import { clamp } from './util';

export interface Pollster {
  name: string;
  /** House effect in points toward right-leaning (+) or left-leaning (-) candidates. */
  house: number;
  sample: [number, number];
  rating: 'A+' | 'A' | 'B' | 'C';
  nationalOnly?: boolean;
}

export const POLLSTERS: Pollster[] = [
  { name: 'Meridian Research', house: 0, sample: [1200, 2200], rating: 'A+' },
  { name: 'Atlas Data', house: 0.6, sample: [900, 1600], rating: 'A' },
  { name: 'Beacon Institute', house: -0.8, sample: [800, 1500], rating: 'A' },
  { name: 'Heartland Poll', house: 1.8, sample: [600, 1100], rating: 'B' },
  { name: 'Coastal Insights', house: -1.6, sample: [600, 1000], rating: 'B' },
  { name: 'Granite University', house: -0.3, sample: [500, 900], rating: 'A' },
  { name: 'Lone Star Survey', house: 1.2, sample: [500, 900], rating: 'B' },
  { name: 'QuickPulse Online', house: 0.4, sample: [1500, 3500], rating: 'C', nationalOnly: true },
];

function conductPoll(game: GameState, snap: Snapshot, scope: string, rng: Rng): Poll {
  const pollster = scope === 'national' ? rng.pick(POLLSTERS) : rng.pick(POLLSTERS.filter((p) => !p.nationalOnly));
  const sample = rng.int(pollster.sample[0], pollster.sample[1]);
  const base = scope === 'national' ? snap.national : snap.states[scope].estimate;
  const undecidedTrue = scope === 'national' ? snap.undecided : snap.states[scope].undecided;
  const ratingNoise = pollster.rating === 'C' ? 1.6 : pollster.rating === 'B' ? 1.25 : 1;
  const results: Record<string, number> = {};
  let total = 0;
  for (const c of game.candidates) {
    const p = base[c.id] * (1 - undecidedTrue);
    const se = Math.sqrt((p * (1 - p)) / sample) * ratingNoise;
    const house = (pollster.house / 100) * PARTIES[c.party].axis * 0.5;
    const v = clamp(p + rng.normal(0, se) + house, 0.001, 0.99);
    results[c.id] = v;
    total += v;
  }
  const undecided = clamp(undecidedTrue + rng.normal(0, 0.01), 0.005, 0.3);
  const scale = (1 - undecided) / total;
  for (const id of Object.keys(results)) results[id] = Math.round(results[id] * scale * 1000) / 10;
  return {
    id: nextId(game, 'p'),
    day: game.day,
    pollster: pollster.name,
    scope,
    sample,
    moe: Math.round((98 / Math.sqrt(sample)) * 10) / 10,
    results,
    undecided: Math.round(undecided * 1000) / 10,
  };
}

/** Release today's polls. Competitive, high-EV states are polled far more often. */
export function releasePolls(game: GameState, snap: Snapshot, rng: Rng, count?: { national: number; states: number }) {
  const nNational = count?.national ?? (rng.chance(0.65) ? 1 : 0) + (rng.chance(0.15) ? 1 : 0);
  const nStates = count?.states ?? rng.int(1, 3);
  for (let i = 0; i < nNational; i++) game.polls.unshift(conductPoll(game, snap, 'national', rng));
  for (let i = 0; i < nStates; i++) {
    const s = rng.weighted(STATES, (st) => {
      const sup = snap.states[st.code].estimate;
      const sorted = Object.values(sup).sort((a, b) => b - a);
      const margin = sorted[0] - (sorted[1] ?? 0);
      return Math.sqrt(st.ev) * (0.08 + Math.exp(-margin * 18));
    });
    game.polls.unshift(conductPoll(game, snap, s.code, rng));
  }
  if (game.polls.length > 400) game.polls.length = 400;
}

/** Recency- and sample-weighted polling average for a scope. Returns null if no recent polls. */
export function pollAverage(game: GameState, scope: string, windowDays = 14): { results: Record<string, number>; undecided: number; count: number } | null {
  const recent = game.polls.filter((p) => p.scope === scope && game.day - p.day <= windowDays);
  if (!recent.length) return null;
  const results: Record<string, number> = {};
  let und = 0;
  let wTotal = 0;
  for (const p of recent) {
    const w = Math.sqrt(p.sample) * Math.pow(0.88, game.day - p.day);
    wTotal += w;
    und += p.undecided * w;
    for (const [id, v] of Object.entries(p.results)) results[id] = (results[id] ?? 0) + v * w;
  }
  for (const id of Object.keys(results)) results[id] /= wTotal;
  return { results, undecided: und / wTotal, count: recent.length };
}

/** Localized name of a poll scope ('national' or a state code). */
export function scopeName(code: string): LStr {
  return code === 'national' ? L('Cały kraj', 'National') : stateName(code);
}
