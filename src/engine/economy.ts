// Macro-economy: slow mean-reverting random walk with monthly data releases that move the
// news agenda and reward or punish the incumbent party.

import type { Economy, GameState } from './types';
import type { Rng } from './rng';
import { clamp } from './util';
import { economyIndex } from './voterModel';
import { pushNews } from './news';
import { PARTIES } from '../data/parties';

export function initialEconomy(rng: Rng): Economy {
  const e: Economy = {
    gdp: clamp(rng.normal(2.0, 0.9), -1, 4.5),
    inflation: clamp(rng.normal(3.1, 0.9), 1.2, 7),
    unemployment: clamp(rng.normal(4.3, 0.6), 3.2, 7.5),
    gas: clamp(rng.normal(3.4, 0.35), 2.6, 5),
    confidence: 50,
  };
  e.confidence = 50 + economyIndex(e) * 40;
  return e;
}

export function stepEconomy(game: GameState, rng: Rng) {
  const e = game.economy;
  e.gdp = clamp(e.gdp + (2.1 - e.gdp) * 0.012 + rng.normal(0, 0.06), -4, 6);
  e.inflation = clamp(e.inflation + (2.8 - e.inflation) * 0.008 + rng.normal(0, 0.035), 0, 12);
  e.unemployment = clamp(e.unemployment + (4.3 - e.unemployment) * 0.008 + rng.normal(0, 0.022) - (e.gdp - 2) * 0.002, 2.8, 12);
  e.gas = clamp(e.gas + (3.4 - e.gas) * 0.012 + rng.normal(0, 0.03), 2, 7);
  e.confidence = 50 + economyIndex(e) * 40;
  game.econHistory.push({ day: game.day, ...e });

  // Monthly reports drive coverage.
  const cycle = game.day % 30;
  if (cycle === 12) jobsReport(game);
  if (cycle === 24) cpiReport(game);
}

function monthAgo(game: GameState) {
  return game.econHistory[Math.max(0, game.econHistory.length - 31)];
}

function incumbentLabel(game: GameState) {
  const p = game.settings.incumbentParty;
  return p ? PARTIES[p].name : 'rządu';
}

function jobsReport(game: GameState) {
  const prev = monthAgo(game);
  const e = game.economy;
  const delta = e.unemployment - prev.unemployment;
  const jobs = Math.round(180 - delta * 900 + (e.gdp - 2) * 40);
  const good = jobs > 150;
  game.salienceShock.jobs += good ? -0.05 : 0.18;
  pushNews(
    game,
    `Raport z rynku pracy: ${jobs >= 0 ? '+' : ''}${jobs} tys. miejsc pracy, bezrobocie ${e.unemployment.toFixed(1)}%`,
    {
      tone: good ? 'good' : 'bad',
      category: 'economy',
      body: good
        ? `Solidne dane wzmacniają argumenty ${incumbentLabel(game)}.`
        : `Słabe dane to prezent dla opozycji — wyborcy coraz częściej wskazują pracę jako kluczowy problem.`,
    },
  );
}

function cpiReport(game: GameState) {
  const prev = monthAgo(game);
  const e = game.economy;
  const rising = e.inflation > prev.inflation + 0.05;
  game.salienceShock.inflation += rising ? 0.2 : -0.06;
  pushNews(game, `Inflacja CPI: ${e.inflation.toFixed(1)}% r/r ${rising ? '— ceny znów rosną' : '— presja cenowa słabnie'}`, {
    tone: rising ? 'bad' : 'good',
    category: 'economy',
    body: `Benzyna kosztuje średnio $${e.gas.toFixed(2)} za galon.`,
  });
}
