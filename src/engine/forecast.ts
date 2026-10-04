// Monte-Carlo forecast in the style of election models: correlated national, regional and state
// shocks on top of the current public estimate, with uncertainty shrinking toward Election Day.

import { STATES, EV_TO_WIN } from '../data/states';
import { TUNING } from './config';
import type { Forecast, GameState } from './types';
import { createRng } from './rng';
import type { Snapshot } from './voterModel';

export function runForecast(game: GameState, snap: Snapshot, sims = TUNING.forecastSims): Forecast {
  const rng = createRng((game.settings.seed ^ (game.day * 7919)) >>> 0);
  const ids = game.candidates.map((c) => c.id);
  const daysLeft = game.settings.totalDays - game.day;
  const timeFactor = Math.sqrt(Math.max(0, daysLeft) / game.settings.totalDays);
  const sdNat = TUNING.pollingErrorNational + 0.08 * timeFactor;
  const sdReg = TUNING.pollingErrorRegional + 0.02 * timeFactor;
  const sdState = TUNING.pollingErrorState;
  const regions = ['northeast', 'south', 'midwest', 'west', 'mountain'] as const;

  const wins: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  const evSum: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  const stateWins: Record<string, Record<string, number>> = {};
  for (const s of STATES) stateWins[s.code] = Object.fromEntries(ids.map((id) => [id, 0]));
  let noMajority = 0;

  const logEst: Record<string, number[]> = {};
  for (const s of STATES) logEst[s.code] = ids.map((id) => Math.log(Math.max(1e-4, snap.states[s.code].estimate[id])));

  for (let k = 0; k < sims; k++) {
    const nat = ids.map(() => rng.normal(0, sdNat));
    const reg: Record<string, number[]> = {};
    for (const r of regions) reg[r] = ids.map(() => rng.normal(0, sdReg));
    const ev = ids.map(() => 0);
    for (const s of STATES) {
      const base = logEst[s.code];
      let best = 0;
      let bestV = -Infinity;
      for (let i = 0; i < ids.length; i++) {
        const v = base[i] + nat[i] + reg[s.region][i] + rng.normal(0, sdState);
        if (v > bestV) {
          bestV = v;
          best = i;
        }
      }
      ev[best] += s.ev;
      stateWins[s.code][ids[best]] += 1;
    }
    let winner = -1;
    for (let i = 0; i < ids.length; i++) {
      evSum[ids[i]] += ev[i];
      if (ev[i] >= EV_TO_WIN) winner = i;
    }
    if (winner >= 0) wins[ids[winner]] += 1;
    else {
      noMajority += 1;
      // Contingent election proxy: the EV leader usually prevails in the House.
      const lead = ev.indexOf(Math.max(...ev));
      wins[ids[lead]] += 1;
    }
  }

  const winProb: Record<string, number> = {};
  const evMean: Record<string, number> = {};
  for (const id of ids) {
    winProb[id] = wins[id] / sims;
    evMean[id] = evSum[id] / sims;
  }
  const stateWinProb: Record<string, Record<string, number>> = {};
  for (const s of STATES) stateWinProb[s.code] = Object.fromEntries(ids.map((id) => [id, stateWins[s.code][id] / sims]));
  return { winProb, evMean, noMajority: noMajority / sims, stateWinProb };
}
