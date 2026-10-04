// Macro-economy: slow mean-reverting random walk with monthly data releases that move the
// news agenda and reward or punish the incumbent party.

import type { Economy, GameState } from './types';
import type { Rng } from './rng';
import { clamp } from './util';
import { economyIndex } from './voterModel';
import { pushNews } from './news';
import { L, type LStr } from '../i18n';
import { PARTIES } from '../data/parties';

export function initialEconomy(rng: Rng): Economy {
  const e: Economy = {
    gdp: clamp(rng.normal(2.0, 0.9), -1, 4.5),
    inflation: clamp(rng.normal(3.1, 0.9), 1.2, 7),
    unemployment: clamp(rng.normal(4.3, 0.6), 3.2, 7.5),
    gas: clamp(rng.normal(3.4, 0.35), 2.6, 5),
    rate: 0,
    stocks: clamp(rng.normal(5000, 250), 4300, 5700),
    confidence: 50,
  };
  // The Fed sets rates roughly by a Taylor rule.
  e.rate = clamp(Math.round((2.2 + 1.3 * (e.inflation - 2) - 0.4 * (e.unemployment - 4.3)) * 4) / 4, 0.25, 7);
  e.confidence = 50 + economyIndex(e) * 40;
  return e;
}

export function stepEconomy(game: GameState, rng: Rng) {
  const e = game.economy;
  e.gdp = clamp(e.gdp + (2.1 - e.gdp) * 0.012 + rng.normal(0, 0.06), -4, 6);
  e.inflation = clamp(e.inflation + (2.8 - e.inflation) * 0.008 + rng.normal(0, 0.035), 0, 12);
  e.unemployment = clamp(e.unemployment + (4.3 - e.unemployment) * 0.008 + rng.normal(0, 0.022) - (e.gdp - 2) * 0.002, 2.8, 12);
  e.gas = clamp(e.gas + (3.4 - e.gas) * 0.012 + rng.normal(0, 0.03), 2, 7);
  // Stocks: drift with growth, hurt by high rates; fat-ish tails.
  const drift = 0.00025 + (e.gdp - 2) * 0.0003 - (e.rate - 4) * 0.0002 + (5000 - e.stocks) * 0.000004;
  e.stocks = clamp(e.stocks * (1 + drift + rng.normal(0, 0.0085)), 2500, 9000);
  e.confidence = 50 + economyIndex(e) * 40;
  game.econHistory.push({ day: game.day, ...e });
  updateApproval(game, rng);

  // Monthly reports and Fed meetings drive coverage.
  const cycle = game.day % 30;
  if (cycle === 12) jobsReport(game);
  if (cycle === 24) cpiReport(game);
  if (game.day % 21 === 17) fedMeeting(game);
  marketMoves(game);
}

/** Administration approval follows the economy slowly; events shift it directly. */
export function updateApproval(game: GameState, rng: Rng) {
  const target = 44 + economyIndex(game.economy) * 12;
  game.approval = clamp(game.approval + (target - game.approval) * 0.04 + rng.normal(0, 0.25), 25, 70);
}

function fedMeeting(game: GameState) {
  const e = game.economy;
  const target = clamp(2.2 + 1.3 * (e.inflation - 2) - 0.4 * (e.unemployment - 4.3), 0.25, 7);
  const step = target > e.rate + 0.2 ? 0.25 : target < e.rate - 0.2 ? -0.25 : 0;
  e.rate = Math.round((e.rate + step) * 100) / 100;
  if (step === 0) {
    pushNews(game, L(`Fed pozostawia stopy procentowe bez zmian (${e.rate.toFixed(2)}%)`, `The Fed holds interest rates steady (${e.rate.toFixed(2)}%)`), { category: 'economy' });
    return;
  }
  e.stocks *= step < 0 ? 1.012 : 0.99;
  pushNews(game, L(`Fed ${step < 0 ? 'obniża' : 'podnosi'} stopy procentowe do ${e.rate.toFixed(2)}%`, `The Fed ${step < 0 ? 'cuts' : 'raises'} interest rates to ${e.rate.toFixed(2)}%`), {
    category: 'economy',
    tone: step < 0 ? 'good' : 'bad',
    severity: 'moderate',
    body: step < 0 ? L('Tańszy kredyt cieszy rynki i kupujących domy.', 'Cheaper credit cheers markets and home buyers.') : L('Droższe kredyty hipoteczne uderzają w kieszenie rodzin.', 'Pricier mortgages hit family budgets.'),
  });
}

function marketMoves(game: GameState) {
  const h = game.econHistory;
  if (h.length < 2) return;
  const prev = h[h.length - 2].stocks;
  const chg = (game.economy.stocks - prev) / prev;
  if (Math.abs(chg) < 0.022) return;
  const pct = (Math.abs(chg) * 100).toFixed(1);
  pushNews(game, L(`Wall Street: indeks ${chg > 0 ? 'rośnie' : 'spada'} o ${pct}% w jeden dzień`, `Wall Street: stocks ${chg > 0 ? 'jump' : 'drop'} ${pct}% in a single day`), {
    category: 'economy',
    tone: chg > 0 ? 'good' : 'bad',
  });
}

function monthAgo(game: GameState) {
  return game.econHistory[Math.max(0, game.econHistory.length - 31)];
}

function incumbentLabel(game: GameState): LStr {
  const p = game.settings.incumbentParty;
  return p ? PARTIES[p].name : L('rządu', 'the administration');
}

function jobsReport(game: GameState) {
  const prev = monthAgo(game);
  const e = game.economy;
  const delta = e.unemployment - prev.unemployment;
  const jobs = Math.round(180 - delta * 900 + (e.gdp - 2) * 40);
  const good = jobs > 150;
  game.salienceShock.jobs += good ? -0.05 : 0.18;
  const sign = jobs >= 0 ? '+' : '';
  const inc = incumbentLabel(game);
  pushNews(game, L(`Raport z rynku pracy: ${sign}${jobs} tys. miejsc pracy, bezrobocie ${e.unemployment.toFixed(1)}%`, `Jobs report: ${sign}${jobs}K jobs, unemployment at ${e.unemployment.toFixed(1)}%`), {
    tone: good ? 'good' : 'bad',
    category: 'economy',
    body: good
      ? L(`Solidne dane wzmacniają argumenty: ${inc.pl}.`, `Solid numbers strengthen the case for ${inc.en}.`)
      : L('Słabe dane to prezent dla opozycji — wyborcy coraz częściej wskazują pracę jako kluczowy problem.', 'Weak numbers are a gift to the opposition — voters increasingly name jobs as a key issue.'),
  });
}

function cpiReport(game: GameState) {
  const prev = monthAgo(game);
  const e = game.economy;
  const rising = e.inflation > prev.inflation + 0.05;
  game.salienceShock.inflation += rising ? 0.2 : -0.06;
  const inf = e.inflation.toFixed(1);
  pushNews(game, L(`Inflacja konsumencka: ${inf}% r/r ${rising ? '— ceny znów rosną' : '— presja cenowa słabnie'}`, `CPI inflation: ${inf}% y/y ${rising ? '— prices are rising again' : '— price pressure is easing'}`), {
    tone: rising ? 'bad' : 'good',
    category: 'economy',
    body: L(`Benzyna kosztuje średnio $${e.gas.toFixed(2)} za galon.`, `Gas averages $${e.gas.toFixed(2)} a gallon.`),
  });
}
