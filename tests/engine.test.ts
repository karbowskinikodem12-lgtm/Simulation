import { describe, expect, test } from 'vitest';
import { STATES, TOTAL_EV, EV_TO_WIN } from '../src/data/states';
import { computeSnapshot } from '../src/engine/voterModel';
import { advanceDay, simulateToEnd } from '../src/engine/simulation';
import { addToSchedule, launchAd, openOffice } from '../src/engine/actions';
import { analyzeProgramText, generatePlatform } from '../src/engine/platform';
import { emptyPositions } from '../src/data/issues';
import { makeGame } from './helpers';

describe('data', () => {
  test('51 jurisdictions and 538 electoral votes', () => {
    expect(STATES.length).toBe(51);
    expect(TOTAL_EV).toBe(538);
    expect(EV_TO_WIN).toBe(270);
  });
});

describe('voter model', () => {
  test('shares are valid probabilities', () => {
    const g = makeGame(3, { three: true });
    const snap = computeSnapshot(g);
    for (const s of STATES) {
      const sum = Object.values(snap.states[s.code].shares).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 6);
    }
    expect(snap.nationalTrue.c2).toBeLessThan(0.12);
  });

  test('deep-red and deep-blue states behave', () => {
    const g = makeGame(4);
    const snap = computeSnapshot(g);
    expect(snap.states.WY.shares.c1).toBeGreaterThan(0.6);
    expect(snap.states.DC.shares.c0).toBeGreaterThan(0.8);
  });
});

describe('campaign', () => {
  test('full spectator campaign produces a consistent result', () => {
    const g = makeGame(11, { three: true });
    simulateToEnd(g);
    expect(g.phase).toBe('election');
    const r = g.result!;
    const evSum = Object.values(r.ev).reduce((a, b) => a + b, 0);
    expect(evSum).toBe(538);
    expect(r.turnout).toBeGreaterThan(0.45);
    expect(r.turnout).toBeLessThan(0.85);
    expect(Number.isFinite(r.totalVotes)).toBe(true);
    expect(r.analysis.reasons.length).toBeGreaterThan(0);
    expect(g.history.length).toBe(61);
    for (const c of g.candidates) expect(Number.isFinite(c.funds)).toBe(true);
  });

  test('player actions are validated and applied', () => {
    const g = makeGame(5, { playerIndex: 0 });
    expect(addToSchedule(g, 'c0', 'rally', { state: 'PA' })).toBeNull();
    expect(addToSchedule(g, 'c0', 'rally')).not.toBeNull();
    expect(launchAd(g, 'c0', { scope: 'PA', kind: 'positive', days: 7 })).toBeNull();
    expect(openOffice(g, 'c0', 'PA')).toBeNull();
    const before = computeSnapshot(g).states.PA.shares.c0;
    advanceDay(g);
    // the game may block on an event, but the rally must have happened
    expect(g.candidates[0].totals.rallies).toBe(1);
    expect(computeSnapshot(g).states.PA.shares.c0).toBeGreaterThan(before - 0.02);
  });

  test('ME and NE can split electoral votes', () => {
    const g = makeGame(21);
    simulateToEnd(g);
    const me = g.result!.states.ME.ev;
    expect(Object.values(me).reduce((a, b) => a + b, 0)).toBe(4);
  });
});

describe('platform AI', () => {
  test('generated platforms follow party ideology', () => {
    const d = generatePlatform('DEM', 'senator', 'mainstream', 1);
    const r = generatePlatform('REP', 'senator', 'mainstream', 1);
    expect(d.positions.taxes).toBeLessThan(0);
    expect(r.positions.taxes).toBeGreaterThan(0);
    expect(d.slogan.length).toBeGreaterThan(3);
  });

  test('free text is analysed into positions', () => {
    const a = analyzeProgramText('Obniżymy podatki i zbudujemy mur na granicy. Medicare for All dla każdego!', {}, emptyPositions());
    expect(a.positions.taxes).toBeGreaterThan(30);
    expect(a.positions.immigration).toBeGreaterThan(30);
    expect(a.positions.healthcare).toBeLessThan(-30);
  });
});
