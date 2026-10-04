// Post-election explanation: decomposes the winner's advantage in the decisive states into the
// voter-model factors and turns the biggest ones into readable reasons.

import { EV_TO_WIN, STATES, STATE_BY_CODE } from '../data/states';
import { ISSUE_BY_ID, ISSUE_IDS } from '../data/issues';
import { PARTIES } from '../data/parties';
import type { Analysis, ElectionResult, GameState, IssueId } from './types';
import { FACTOR_LABEL, NATIONAL_IDEAL, type FactorKey, type Snapshot } from './voterModel';
import { fmtMoney } from './util';
import { GROUP_IDS, GROUP_LABEL, GROUP_SHORT } from './groups';

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
      case 'social':
        return `Wygrana w mediach społecznościowych: ${who.name} miał(a) większy zasięg i buzz wśród młodych wyborców.`;
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

  const { summary, swingStates, groupNotes, rivalNotes } = groupAndStateStory(game, result, winnerId, runnerId);
  reasons.unshift(...groupNotes);
  caveats.push(...rivalNotes);

  return { headline, reasons, caveats, factors: factors.map(({ label, value }) => ({ label, value })), tippingPoint: tp, summary, swingStates };
}

function plMargin(v: number) {
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)} pkt`;
}

/**
 * Narrative built from what changed between the start of the campaign and Election Day:
 * which voter groups moved, who turned out, and which swing states swung.
 */
function groupAndStateStory(game: GameState, result: ElectionResult, W: string, R: string) {
  const base = game.baseline;
  const wName = game.candidates.find((c) => c.id === W)!.name;
  const notes: string[] = [];
  const rivalNotes: string[] = [];
  const swingStates = base
    ? STATES.filter((s) => {
        const sh = Object.values(base.stateShares[s.code]).sort((a, b) => b - a);
        return sh[0] - sh[1] < 0.07;
      })
        .sort((a, b) => b.ev - a.ev)
        .map((s) => s.code)
    : [];
  if (!base) return { summary: `${wName} wygrywa wybory.`, swingStates, groupNotes: notes, rivalNotes };

  const margin = (shares: Record<string, number>) => (shares[W] ?? 0) - (shares[R] ?? 0);
  const groups = GROUP_IDS.filter((g) => result.groups[g].size >= 0.08);
  const gain = groups
    .map((g) => ({ g, d: margin(result.groups[g].shares) - margin(base.groups[g].shares) }))
    .sort((a, b) => b.d - a.d);
  // Turnout growth relative to the electorate as a whole (interest rises for everyone near Election Day).
  const overall = result.turnout / Math.max(0.01, base.turnout);
  const turnoutUp = groups
    .filter((g) => margin(result.groups[g].shares) > 0)
    .map((g) => ({ g, d: result.groups[g].turnout / Math.max(0.01, base.groups[g].turnout) - overall, size: result.groups[g].size }))
    .sort((a, b) => b.d * b.size - a.d * a.size);

  const swingMoves = swingStates
    .filter((code) => result.states[code].winner === W)
    .map((code) => ({ code, d: margin(result.states[code].shares) - margin(base.stateShares[code]) }))
    .sort((a, b) => b.d - a.d)
    .slice(0, 2);

  const parts: string[] = [];
  if (turnoutUp[0] && turnoutUp[0].d > 0.004) parts.push(`wysoka frekwencja wśród ${GROUP_SHORT[turnoutUp[0].g]}`);
  const turnoutGroup = turnoutUp[0] && turnoutUp[0].d > 0.004 ? turnoutUp[0].g : undefined;
  const gainPick = gain.find((x) => x.g !== turnoutGroup && x.d > 0.01);
  if (gainPick) parts.push(`wzrost poparcia wśród ${GROUP_SHORT[gainPick.g]} (${plMargin(gainPick.d)})`);
  if (swingMoves.length) parts.push(`poprawa wyników w ${swingMoves.length > 1 ? 'stanach' : 'stanie'} ${swingMoves.map((m) => STATE_BY_CODE[m.code].name).join(' i ')}`);
  const strongest = groups.filter((g) => margin(result.groups[g].shares) > 0).sort((a, b) => margin(result.groups[b].shares) - margin(result.groups[a].shares))[0];
  if (!parts.length && strongest) parts.push(`zdecydowana przewaga wśród ${GROUP_SHORT[strongest]}`);
  const summary = parts.length ? `Zwycięstwo ${wName} zapewniły: ${parts.length > 1 ? parts.slice(0, -1).join(', ') + ' oraz ' + parts[parts.length - 1] : parts[0]}.` : `${wName} utrzymał(a) przewagę z początku kampanii.`;

  if (gain[0] && gain[0].d > 0.01) notes.push(`Największa zmiana w trakcie kampanii: ${GROUP_LABEL[gain[0].g].toLowerCase()} — przewaga ${wName} zmieniła się o ${plMargin(gain[0].d)}.`);
  const last = gain[gain.length - 1];
  if (last && last.d < -0.015) rivalNotes.push(`Rywal poprawił wynik w grupie: ${GROUP_LABEL[last.g].toLowerCase()} (${plMargin(-last.d)}).`);
  if (turnoutUp[0] && turnoutUp[0].d > 0.004) notes.push(`Mobilizacja: frekwencja wśród ${GROUP_SHORT[turnoutUp[0].g]} (grupa sprzyjająca ${wName}) wzrosła szybciej niż w całym elektoracie.`);
  return { summary, swingStates, groupNotes: notes, rivalNotes };
}
