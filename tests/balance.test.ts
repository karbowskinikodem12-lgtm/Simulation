import { test } from 'vitest';
import { advanceDay, chooseEventOption, concludeDebate, playDebateRound, simulateToEnd } from '../src/engine/simulation';
import { DEBATE_ROUNDS } from '../src/engine/debate';
import type { GameState } from '../src/engine/types';
import { makeGame } from './helpers';

function report(label: string, games: GameState[]) {
  const wins: Record<string, number> = {};
  const evs: number[] = [];
  let splits = 0, turnout = 0, contingent = 0;
  const flash: number[] = [];
  for (const g of games) {
    const r = g.result!;
    const p = g.candidates.find((c) => c.id === r.winner)!.party;
    wins[p] = (wins[p] ?? 0) + 1;
    evs.push(r.ev[r.winner]);
    if (r.contingent) contingent++;
    if (Object.entries(r.popular).sort((a, b) => b[1] - a[1])[0][0] !== r.winner) splits++;
    turnout += r.turnout;
    for (const d of g.debates) if (d.winner) flash.push(d.flashPoll![d.winner]);
  }
  const avg = (xs: number[]) => (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(0);
  console.log(`[${label}] wins ${JSON.stringify(wins)} | winner EV avg ${avg(evs)} min ${Math.min(...evs)} max ${Math.max(...evs)} | splits ${splits} contingent ${contingent} | turnout ${((turnout / games.length) * 100).toFixed(1)}% | debate winner flash avg ${avg(flash)} max ${Math.max(...flash)}`);
}

// Statistical sanity check of many campaigns. Run with `npm run simulate`.
test.skipIf(!process.env.SIMULATE)('balance report', () => {
  const N = 30;
  const spectator: GameState[] = [];
  for (let i = 0; i < N; i++) {
    const g = makeGame(1000 + i, { three: i % 4 === 0, incumbentParty: i % 2 ? 'DEM' : 'REP' });
    simulateToEnd(g);
    spectator.push(g);
  }
  report('AI vs AI', spectator);

  // Player on autopilot only (no ads, no offices, random debate answers).
  const passive: GameState[] = [];
  for (let i = 0; i < N; i++) {
    const g = makeGame(2000 + i, { playerIndex: i % 2, incumbentParty: null });
    let guard = 0;
    while (g.phase === 'campaign' && guard++ < 500) {
      if (g.pendingEvent) chooseEventOption(g, 0);
      if (g.liveDebate) {
        const opts = ['facts', 'attack', 'empathy', 'pivot'] as const;
        while (g.liveDebate.round < DEBATE_ROUNDS) playDebateRound(g, opts[(guard + g.liveDebate.round) % 4]);
        concludeDebate(g);
      }
      advanceDay(g);
    }
    passive.push(g);
  }
  const playerWins = passive.filter((g) => g.result!.winner === g.playerId).length;
  report('autopilot player', passive);
  console.log(`autopilot player won ${playerWins}/${N}`);
}, 180000);
