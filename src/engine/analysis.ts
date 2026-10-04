// Post-election explanation: decomposes the winner's advantage in the decisive states into the
// voter-model factors and turns the biggest ones into readable reasons.

import { EV_TO_WIN, STATES, STATE_BY_CODE } from '../data/states';
import { ISSUE_BY_ID, ISSUE_IDS } from '../data/issues';
import { PARTIES } from '../data/parties';
import type { Analysis, ElectionResult, GameState, IssueId } from './types';
import { FACTOR_LABEL, NATIONAL_IDEAL, type FactorKey, type Snapshot } from './voterModel';
import { fmtMoney } from './util';

/** Polish plural for "zwycięstwo". */
function wins(n: number): string {
  if (n === 1) return '1 zwycięstwo';
  const tens = n % 100;
  if (n % 10 >= 2 && n % 10 <= 4 && (tens < 12 || tens > 14)) return `${n} zwycięstwa`;
  return `${n} zwycięstw`;
}

function tippingPoint(result: ElectionResult, winner: string): string | undefined {
  const ordered = STATES.map((s) => {
    const sh = result.states[s.code].shares;
    const best = Math.max(...Object.entries(sh).filter(([id]) => id !== winner).map(([, v]) => v));
    return { code: s.code, margin: sh[winner] - best, ev: s.ev };
  }).sort((a, b) => b.margin - a.margin);
  let acc = 0;
  for (const s of ordered) {
    acc += s.ev;
    if (acc >= EV_TO_WIN) return s.code;
  }
  return undefined;
}

export function analyzeResult(game: GameState, result: ElectionResult, snap: Snapshot): Analysis {
  const ids = game.candidates.map((c) => c.id);
  const byEv = [...ids].sort((a, b) => result.ev[b] - result.ev[a]);
  const winnerId = result.winner;
  const runnerId = byEv.find((id) => id !== winnerId)!;
  const W = game.candidates.find((c) => c.id === winnerId)!;
  const R = game.candidates.find((c) => c.id === runnerId)!;

  // Decisive states: closest 10 by final margin between the top two.
  const decisive = STATES.map((s) => ({ s, m: Math.abs(result.states[s.code].shares[winnerId] - result.states[s.code].shares[runnerId]) }))
    .sort((a, b) => a.m - b.m)
    .slice(0, 10);
  const totalEv = decisive.reduce((a, d) => a + d.s.ev, 0);

  const keys = Object.keys(FACTOR_LABEL) as FactorKey[];
  const diff: Record<FactorKey, number> = Object.fromEntries(keys.map((k) => [k, 0])) as Record<FactorKey, number>;
  for (const { s } of decisive) {
    const comp = snap.states[s.code].components;
    for (const k of keys) diff[k] += ((comp[winnerId][k] - comp[runnerId][k]) * s.ev) / totalEv;
  }
  const factors = keys.map((k) => ({ label: FACTOR_LABEL[k], value: diff[k], key: k })).filter((f) => Math.abs(f.value) > 0.003);
  factors.sort((a, b) => b.value - a.value);

  // Issues where the winner was closer to voters, weighted by salience.
  const issueGap = (id: IssueId) => (Math.abs(R.positions[id] - NATIONAL_IDEAL[id]) - Math.abs(W.positions[id] - NATIONAL_IDEAL[id])) * snap.salience[id];
  const winIssues = [...ISSUE_IDS].sort((a, b) => issueGap(b) - issueGap(a)).filter((id) => issueGap(id) > 0.3).slice(0, 3);
  const loseIssues = [...ISSUE_IDS].sort((a, b) => issueGap(a) - issueGap(b)).filter((id) => issueGap(id) < -0.3).slice(0, 2);

  const describe = (k: FactorKey, positive: boolean): string => {
    const who = positive ? W : R;
    const other = positive ? R : W;
    switch (k) {
      case 'partisan':
        return `Mapa polityczna sprzyjała kandydatowi ${who.name}: elektorat ${PARTIES[who.party].name} jest silniejszy w kluczowych stanach.`;
      case 'issues':
        return positive && winIssues.length
          ? `Program ${W.name} był bliższy wyborcom w sprawach, które ich najbardziej obchodziły: ${winIssues.map((i) => ISSUE_BY_ID[i].label.toLowerCase()).join(', ')}.`
          : `Stanowiska ${who.name} lepiej trafiały w oczekiwania wyborców niż program ${other.name}.`;
      case 'quality':
        return `Wyborcy wyżej oceniali doświadczenie i charyzmę: ${who.name}.`;
      case 'favor':
        return `Lepszy wizerunek na finiszu kampanii: ${who.name} — poparcie netto ${who.favorability.toFixed(0)} wobec ${other.favorability.toFixed(0)} u rywala.`;
      case 'momentum':
        return `Momentum w końcówce kampanii było po stronie: ${who.name} — media i sondaże sprzyjały do samej mety.`;
      case 'economy': {
        const inc = game.settings.incumbentParty ? PARTIES[game.settings.incumbentParty].name : '';
        return game.economy.confidence >= 50
          ? `Dobra kondycja gospodarki (zaufanie konsumentów ${game.economy.confidence.toFixed(0)}/100) pomogła partii rządzącej (${inc}).`
          : `Słaba gospodarka (zaufanie konsumentów ${game.economy.confidence.toFixed(0)}/100) obciążyła partię rządzącą (${inc}).`;
      }
      case 'effort':
        return `Lepsza kampania w terenie — ${who.name}: ${who.totals.rallies} wieców i ${fmtMoney(who.totals.spent)} wydatków (rywal: ${other.totals.rallies} wieców, ${fmtMoney(other.totals.spent)}).`;
      case 'home':
        return `Efekt stanu rodzinnego: lokalny patriotyzm w ${STATE_BY_CODE[who.homeState].name} działał na korzyść: ${who.name}.`;
      case 'local':
        return `Lokalne wydarzenia (poparcia, kryzysy, reakcje na katastrofy) przechyliły kilka ważnych stanów na korzyść ${who.name}.`;
      case 'brand':
        return `Bariera kandydata spoza dwóch głównych partii ograniczała wynik: ${other.name}.`;
    }
  };

  const pos = factors.filter((f) => f.value > 0).slice(0, 3);
  const neg = factors.filter((f) => f.value < 0).sort((a, b) => a.value - b.value).slice(0, 2);
  const reasons = pos.map((f) => describe(f.key, true));
  const caveats = neg.map((f) => describe(f.key, false));
  if (W.totals.debatesWon > R.totals.debatesWon) reasons.push(`Debaty: ${W.name} — ${wins(W.totals.debatesWon)} w ${game.debates.filter((d) => d.done).length} debatach.`);
  else if (R.totals.debatesWon > W.totals.debatesWon) caveats.push(`Przewaga w debatach (${R.name}: ${wins(R.totals.debatesWon)}) nie wystarczyła do wygranej.`);
  if (loseIssues.length) caveats.push(`Słabsze punkty programu ${W.name}: ${loseIssues.map((i) => ISSUE_BY_ID[i].label.toLowerCase()).join(', ')}.`);

  const evW = result.ev[winnerId];
  const popularLeader = [...ids].sort((a, b) => result.popular[b] - result.popular[a])[0];
  let headline: string;
  if (result.contingent) headline = `Nikt nie zdobył 270 głosów — Izba Reprezentantów wybiera ${W.name}`;
  else if (evW >= 380) headline = `Miażdżące zwycięstwo: ${W.name} zdobywa ${evW} głosów elektorskich`;
  else if (evW <= 290) headline = `Thriller do ostatniego stanu: ${W.name} wygrywa ${evW}–${result.ev[runnerId]}`;
  else headline = `${W.name} zostaje prezydentem z ${evW} głosami elektorskimi`;
  if (popularLeader !== winnerId) caveats.unshift(`Zwycięstwo mimo przegranej w głosowaniu powszechnym — zdecydowało Kolegium Elektorów.`);

  const tp = tippingPoint(result, winnerId);
  if (tp) reasons.push(`Stan decydujący (tipping point): ${STATE_BY_CODE[tp].name} — to on przesądził o przekroczeniu progu ${EV_TO_WIN} głosów.`);

  return { headline, reasons, caveats, factors: factors.map(({ label, value }) => ({ label, value })), tippingPoint: tp };
}
