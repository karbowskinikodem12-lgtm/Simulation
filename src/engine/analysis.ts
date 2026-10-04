// Post-election explanation: decomposes the winner's advantage in the decisive states into the
// voter-model factors and turns the biggest ones into readable reasons.

import { EV_TO_WIN, STATES, stateName } from '../data/states';
import { ISSUE_BY_ID, ISSUE_IDS } from '../data/issues';
import { PARTIES } from '../data/parties';
import type { Analysis, ElectionResult, GameState, IssueId } from './types';
import { FACTOR_LABEL, NATIONAL_IDEAL, type FactorKey, type Snapshot } from './voterModel';
import { moneyL } from './util';
import { bi, join, L, same, type LStr } from '../i18n';
import { GROUP_IDS, GROUP_LABEL, GROUP_SHORT } from './groups';

/** "n wins" with correct Polish plural forms. */
function wins(n: number): LStr {
  const tens = n % 100;
  const pl = n === 1 ? '1 zwycięstwo' : n % 10 >= 2 && n % 10 <= 4 && (tens < 12 || tens > 14) ? `${n} zwycięstwa` : `${n} zwycięstw`;
  return L(pl, n === 1 ? '1 win' : `${n} wins`);
}

const lower = (t: LStr): LStr => ({ pl: t.pl.toLowerCase(), en: t.en.toLowerCase() });

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

  const issueList = (list: IssueId[]) => join(list.map((i) => lower(ISSUE_BY_ID[i].label)));

  const describe = (k: FactorKey, positive: boolean): LStr => {
    const who = positive ? W : R;
    const other = positive ? R : W;
    switch (k) {
      case 'partisan': {
        const party = PARTIES[who.party].name;
        return L(`Mapa polityczna sprzyjała kandydaturze ${who.name}: elektorat (${party.pl}) jest silniejszy w kluczowych stanach.`, `The political map favored ${who.name}: the ${party.en} base is stronger in the key states.`);
      }
      case 'issues': {
        if (positive && winIssues.length) {
          const li = issueList(winIssues);
          return L(`Program ${W.name} był bliższy wyborcom w sprawach, które ich najbardziej obchodziły: ${li.pl}.`, `${W.name}’s platform was closer to voters on the issues they cared about most: ${li.en}.`);
        }
        return L(`Stanowiska ${who.name} lepiej trafiały w oczekiwania wyborców niż program ${other.name}.`, `${who.name}’s positions matched voters’ expectations better than ${other.name}’s platform.`);
      }
      case 'quality':
        return L(`Wyborcy wyżej oceniali doświadczenie i charyzmę: ${who.name}.`, `Voters rated ${who.name}’s experience and charisma higher.`);
      case 'favor': {
        const [a, b] = [who.favorability.toFixed(0), other.favorability.toFixed(0)];
        return L(`Lepszy wizerunek na finiszu kampanii: ${who.name} — poparcie netto ${a} wobec ${b} u rywala.`, `Better image down the stretch: ${who.name} — net favorability ${a} vs ${b} for the rival.`);
      }
      case 'momentum':
        return L(`Impet w końcówce kampanii był po stronie: ${who.name} — media i sondaże sprzyjały do samej mety.`, `Late momentum was with ${who.name} — the media and the polls were favorable to the finish.`);
      case 'economy': {
        const inc = game.settings.incumbentParty ? PARTIES[game.settings.incumbentParty].name : same('');
        const conf = game.economy.confidence.toFixed(0);
        return game.economy.confidence >= 50
          ? L(`Dobra kondycja gospodarki (zaufanie konsumentów ${conf}/100) pomogła partii rządzącej (${inc.pl}).`, `A healthy economy (consumer confidence ${conf}/100) helped the party in power (${inc.en}).`)
          : L(`Słaba gospodarka (zaufanie konsumentów ${conf}/100) obciążyła partię rządzącą (${inc.pl}).`, `A weak economy (consumer confidence ${conf}/100) weighed on the party in power (${inc.en}).`);
      }
      case 'effort': {
        const [m1, m2] = [moneyL(who.totals.spent), moneyL(other.totals.spent)];
        return L(
          `Lepsza kampania w terenie — ${who.name}: ${who.totals.rallies} wieców i ${m1.pl} wydatków (rywal: ${other.totals.rallies} wieców, ${m2.pl}).`,
          `A better ground campaign — ${who.name}: ${who.totals.rallies} rallies and ${m1.en} spent (rival: ${other.totals.rallies} rallies, ${m2.en}).`,
        );
      }
      case 'home': {
        const st = stateName(who.homeState);
        return L(`Efekt stanu rodzinnego: lokalny patriotyzm (${st.pl}) działał na korzyść: ${who.name}.`, `Home-state effect: local pride in ${st.en} worked in ${who.name}’s favor.`);
      }
      case 'social':
        return L(`Wygrana w mediach społecznościowych: większy zasięg i rozgłos wśród młodych wyborców — ${who.name}.`, `Winning on social media: ${who.name} had more reach and buzz with young voters.`);
      case 'local':
        return L(`Lokalne wydarzenia (poparcia, kryzysy, reakcje na katastrofy) przechyliły kilka ważnych stanów na korzyść ${who.name}.`, `Local events (endorsements, crises, disaster responses) tipped several key states toward ${who.name}.`);
      case 'brand':
        return L(`Bariera kandydata spoza dwóch głównych partii ograniczała wynik: ${other.name}.`, `The third-party barrier held back ${other.name}.`);
    }
  };

  const pos = factors.filter((f) => f.value > 0).slice(0, 3);
  const neg = factors.filter((f) => f.value < 0).sort((a, b) => a.value - b.value).slice(0, 2);
  const reasons: LStr[] = pos.map((f) => describe(f.key, true));
  const caveats: LStr[] = neg.map((f) => describe(f.key, false));
  const debatesDone = game.debates.filter((d) => d.done).length;
  if (W.totals.debatesWon > R.totals.debatesWon) {
    const w = wins(W.totals.debatesWon);
    reasons.push(L(`Debaty: ${W.name} — ${w.pl} w ${debatesDone} debatach.`, `Debates: ${W.name} — ${w.en} in ${debatesDone} debates.`));
  } else if (R.totals.debatesWon > W.totals.debatesWon) {
    const w = wins(R.totals.debatesWon);
    caveats.push(L(`Przewaga w debatach (${R.name}: ${w.pl}) nie wystarczyła do wygranej.`, `Winning the debates (${R.name}: ${w.en}) was not enough to win.`));
  }
  if (loseIssues.length) {
    const li = issueList(loseIssues);
    caveats.push(L(`Słabsze punkty programu ${W.name}: ${li.pl}.`, `Weak spots in ${W.name}’s platform: ${li.en}.`));
  }

  const evW = result.ev[winnerId];
  const popularLeader = [...ids].sort((a, b) => result.popular[b] - result.popular[a])[0];
  let headline: LStr;
  if (result.contingent) headline = L(`Nikt nie zdobył 270 głosów — Izba Reprezentantów wybiera: ${W.name}`, `No one reached 270 — the House of Representatives picks ${W.name}`);
  else if (evW >= 380) headline = L(`Miażdżące zwycięstwo: ${W.name} zdobywa ${evW} głosów elektorskich`, `Landslide: ${W.name} wins ${evW} electoral votes`);
  else if (evW <= 290) headline = L(`Rozstrzygnięcie do ostatniego stanu: ${W.name} wygrywa ${evW}–${result.ev[runnerId]}`, `Down to the wire: ${W.name} wins ${evW}–${result.ev[runnerId]}`);
  else headline = L(`${W.name} zostaje prezydentem z ${evW} głosami elektorskimi`, `${W.name} is elected president with ${evW} electoral votes`);
  if (popularLeader !== winnerId) caveats.unshift(L('Zwycięstwo mimo przegranej w głosowaniu powszechnym — zdecydowało Kolegium Elektorów.', 'Victory despite losing the popular vote — the Electoral College decided.'));

  const tp = tippingPoint(result, winnerId);
  if (tp) {
    const st = stateName(tp);
    reasons.push(L(`Stan przesądzający: ${st.pl} — to on zdecydował o przekroczeniu progu ${EV_TO_WIN} głosów.`, `Tipping-point state: ${st.en} — it put the winner over ${EV_TO_WIN} votes.`));
  }

  const { summary, swingStates, groupNotes, rivalNotes } = groupAndStateStory(game, result, winnerId, runnerId);
  reasons.unshift(...groupNotes);
  caveats.push(...rivalNotes);

  return { headline, reasons, caveats, factors: factors.map(({ label, value }) => ({ label, value })), tippingPoint: tp, summary, swingStates };
}

function marginL(v: number): LStr {
  const n = `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}`;
  return L(`${n} pkt`, `${n} pts`);
}

/** Join list items with commas and a final "and" ("oraz" / "and"). */
function listAnd(parts: LStr[]): LStr {
  return bi((l) => {
    const xs = parts.map((p) => p[l]);
    const and = l === 'pl' ? ' oraz ' : ' and ';
    return xs.length > 1 ? xs.slice(0, -1).join(', ') + and + xs[xs.length - 1] : xs[0];
  });
}

/**
 * Narrative built from what changed between the start of the campaign and Election Day:
 * which voter groups moved, who turned out, and which swing states swung.
 */
function groupAndStateStory(game: GameState, result: ElectionResult, W: string, R: string) {
  const base = game.baseline;
  const wName = game.candidates.find((c) => c.id === W)!.name;
  const notes: LStr[] = [];
  const rivalNotes: LStr[] = [];
  const swingStates = base
    ? STATES.filter((s) => {
        const sh = Object.values(base.stateShares[s.code]).sort((a, b) => b - a);
        return sh[0] - sh[1] < 0.07;
      })
        .sort((a, b) => b.ev - a.ev)
        .map((s) => s.code)
    : [];
  if (!base) return { summary: L(`${wName} wygrywa wybory.`, `${wName} wins the election.`), swingStates, groupNotes: notes, rivalNotes };

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

  const parts: LStr[] = [];
  const turnoutGroup = turnoutUp[0] && turnoutUp[0].d > 0.004 ? turnoutUp[0].g : undefined;
  if (turnoutGroup) parts.push(L(`wysoka frekwencja wśród ${GROUP_SHORT[turnoutGroup].pl}`, `strong turnout among ${GROUP_SHORT[turnoutGroup].en}`));
  const gainPick = gain.find((x) => x.g !== turnoutGroup && x.d > 0.01);
  if (gainPick) {
    const m = marginL(gainPick.d);
    parts.push(L(`wzrost poparcia wśród ${GROUP_SHORT[gainPick.g].pl} (${m.pl})`, `gains among ${GROUP_SHORT[gainPick.g].en} (${m.en})`));
  }
  if (swingMoves.length) {
    const names = bi((l) => swingMoves.map((x) => stateName(x.code)[l]).join(l === 'pl' ? ' i ' : ' and '));
    parts.push(L(`poprawa wyników w ${swingMoves.length > 1 ? 'stanach' : 'stanie'} ${names.pl}`, `improved results in ${names.en}`));
  }
  const strongest = groups.filter((g) => margin(result.groups[g].shares) > 0).sort((a, b) => margin(result.groups[b].shares) - margin(result.groups[a].shares))[0];
  if (!parts.length && strongest) parts.push(L(`zdecydowana przewaga wśród ${GROUP_SHORT[strongest].pl}`, `a commanding lead among ${GROUP_SHORT[strongest].en}`));
  const listed = parts.length ? listAnd(parts) : null;
  const summary = listed
    ? L(`Zwycięstwo ${wName} zapewniły: ${listed.pl}.`, `${wName} won thanks to ${listed.en}.`)
    : L(`${wName} utrzymuje przewagę z początku kampanii do samego końca.`, `${wName} held the early lead all the way to the end.`);

  if (gain[0] && gain[0].d > 0.01) {
    const m = marginL(gain[0].d);
    const g = lower(GROUP_LABEL[gain[0].g]);
    notes.push(L(`Największa zmiana w trakcie kampanii: ${g.pl} — przewaga ${wName} zmieniła się o ${m.pl}.`, `Biggest shift during the campaign: ${g.en} — ${wName}’s margin moved by ${m.en}.`));
  }
  const last = gain[gain.length - 1];
  if (last && last.d < -0.015) {
    const m = marginL(-last.d);
    const g = lower(GROUP_LABEL[last.g]);
    rivalNotes.push(L(`Rywal poprawił wynik w grupie: ${g.pl} (${m.pl}).`, `The rival gained among ${g.en} (${m.en}).`));
  }
  if (turnoutGroup)
    notes.push(L(`Mobilizacja: frekwencja wśród ${GROUP_SHORT[turnoutGroup].pl} (grupa sprzyjająca ${wName}) wzrosła szybciej niż w całym elektoracie.`, `Mobilization: turnout among ${GROUP_SHORT[turnoutGroup].en} (a group favoring ${wName}) grew faster than in the electorate overall.`));
  return { summary, swingStates, groupNotes: notes, rivalNotes };
}
