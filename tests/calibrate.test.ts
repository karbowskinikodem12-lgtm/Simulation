import { test } from 'vitest';
import { STATES } from '../src/data/states';
import { TUNING } from '../src/engine/config';
import { computeSnapshot } from '../src/engine/voterModel';
import { makeGame } from './helpers';

test.skipIf(!process.env.CALIBRATE)('calibration grid', () => {
  const T = TUNING as unknown as Record<string, number>;
  const games = Array.from({ length: 8 }, (_, i) => makeGame(i + 1, { incumbentParty: null }));
  for (const g of games) for (const c of g.candidates) c.favorability = 0;
  const results: string[] = [];
  const t0 = performance.now();
  for (const pw of (process.env.PW ?? '0.4,0.5,0.6').split(',').map(Number)) for (const iw of (process.env.IW ?? '0.45,0.55,0.65').split(',').map(Number)) {
    T.partisanWeight = pw; T.issueWeight = iw;
    let err = 0, n = 0, bias = 0, turnout = 0;
    for (const g of games) {
      const snap = computeSnapshot(g);
      bias += snap.nationalTrue.c1 - snap.nationalTrue.c0;
      turnout += snap.turnout;
      for (const s of STATES) { const m = snap.states[s.code].shares.c1 - snap.states[s.code].shares.c0; err += (m - s.lean) ** 2 * s.ev; n += s.ev; }
    }
    results.push(`pw ${pw} iw ${iw}: rmse ${(Math.sqrt(err / n) * 100).toFixed(1)} bias ${(bias / games.length * 100).toFixed(1)} turnout ${(turnout / games.length * 100).toFixed(1)}`);
  }
  console.log(results.join('\n'));
  const g = games[0];
  const snap = computeSnapshot(g);
  console.log('ms/snapshot', ((performance.now() - t0) / (results.length * games.length + 1)).toFixed(1));
  console.log(['PA','MI','WI','GA','AZ','NV','NC','TX','FL','CA','WY','DC'].map((c) => `${c} lean ${(STATES.find(s=>s.code===c)!.lean*100).toFixed(0)} model ${((snap.states[c].shares.c1 - snap.states[c].shares.c0)*100).toFixed(0)} t ${(snap.states[c].turnout*100).toFixed(0)}`).join(' | '));
  for (const [k, v] of Object.entries(snap.groups)) console.log(k, 'size', (v.size*100).toFixed(0), 'turnout', (v.turnout*100).toFixed(0), 'D', (v.shares.c0*100).toFixed(0), 'R', (v.shares.c1*100).toFixed(0));
});
