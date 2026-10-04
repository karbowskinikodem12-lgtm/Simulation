// Campaign actions shared by the player and AI candidates.
// Schedule actions consume one day of the candidate's time; ads and field offices only cost money.

import { DONOR_HUBS, STATE_BY_CODE } from '../data/states';
import { ISSUE_BY_ID } from '../data/issues';
import { DIFFICULTY_MULT, TUNING } from './config';
import type { AdKind, Candidate, GameState, IssueId, ScheduleKind, ScheduledAction } from './types';
import type { Rng } from './rng';
import { clamp } from './util';
import { issueEdge } from './voterModel';
import { candName, nextId, pushKeyEvent, pushNews } from './news';

export const SCHEDULE_META: Record<ScheduleKind, { label: string; icon: string; needsState: boolean; needsIssue: boolean; cost: number; stamina: number; hint: string }> = {
  rally: { label: 'Wiec', icon: '📣', needsState: true, needsIssue: false, cost: TUNING.rallyCost, stamina: 14, hint: 'Duży wzrost obecności w stanie i entuzjazmu. Ryzyko gafy przy zmęczeniu.' },
  townhall: { label: 'Spotkanie z wyborcami', icon: '🎙️', needsState: true, needsIssue: false, cost: TUNING.townhallCost, stamina: 9, hint: 'Mniejszy zasięg, ale poprawia wizerunek. Niskie ryzyko.' },
  fundraiser: { label: 'Zbiórka funduszy', icon: '💰', needsState: true, needsIssue: false, cost: 0, stamina: 7, hint: 'Pozyskuje pieniądze. Najlepiej w centrach darczyńców (CA, NY, TX, FL…).' },
  speech: { label: 'Przemówienie programowe', icon: '📜', needsState: false, needsIssue: true, cost: 0.05, stamina: 8, hint: 'Podbija znaczenie tematu w mediach. Opłaca się, gdy Twoje stanowisko jest popularne.' },
  interview: { label: 'Wywiad w mediach', icon: '📺', needsState: false, needsIssue: false, cost: 0, stamina: 8, hint: 'Ogólnokrajowy zasięg. Wynik zależy od charyzmy — możliwa wpadka.' },
  debatePrep: { label: 'Przygotowanie do debaty', icon: '🧠', needsState: false, needsIssue: false, cost: 0.05, stamina: 5, hint: 'Zwiększa szanse w najbliższej debacie (+30 przygotowania).' },
  rest: { label: 'Odpoczynek', icon: '🛌', needsState: false, needsIssue: false, cost: 0, stamina: -35, hint: 'Regeneruje kondycję kandydata (+35).' },
};

export function getCandidate(game: GameState, id: string): Candidate {
  const c = game.candidates.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown candidate ${id}`);
  return c;
}

function effectMult(game: GameState, c: Candidate) {
  return c.isPlayer ? 1 : DIFFICULTY_MULT[game.settings.difficulty].ai;
}

function staminaFactor(c: Candidate) {
  return 0.55 + c.stamina / 220;
}

function spend(c: Candidate, amount: number) {
  c.funds -= amount;
  c.totals.spent += amount;
}

export function addToSchedule(game: GameState, candId: string, kind: ScheduleKind, opts: { state?: string; issue?: IssueId } = {}): string | null {
  const c = getCandidate(game, candId);
  if (c.schedule.length >= TUNING.maxScheduleLength) return 'Harmonogram jest pełny (maks. 7 dni).';
  const meta = SCHEDULE_META[kind];
  if (meta.needsState && !opts.state) return 'Wybierz stan.';
  if (meta.needsIssue && !opts.issue) return 'Wybierz temat.';
  const action: ScheduledAction = { id: nextId(game, 'a'), kind, state: opts.state, issue: opts.issue };
  c.schedule.push(action);
  return null;
}

export function removeFromSchedule(game: GameState, candId: string, actionId: string) {
  const c = getCandidate(game, candId);
  c.schedule = c.schedule.filter((a) => a.id !== actionId);
}

function gaffeCheck(game: GameState, c: Candidate, rng: Rng, riskMult: number, where?: string) {
  const p = (0.012 + ((100 - c.stats.discipline) / 100) * 0.045 + (c.stamina < 30 ? 0.05 : 0)) * riskMult;
  if (!rng.chance(p)) return;
  const hit = rng.range(2, 4.5);
  c.favorability -= hit;
  c.momentum -= 0.07;
  const lines = [
    'myli nazwę stanu na wiecu',
    'wygłasza niefortunny komentarz o wyborcach przeciwnika',
    'na nagraniu krytykuje własnych doradców',
    'zalicza wpadkę z liczbami podczas wystąpienia',
    'żartuje w sposób uznany za obraźliwy',
  ];
  const line = rng.pick(lines);
  pushNews(game, `Gafa: ${c.name} ${line}${where ? ` (${where})` : ''}`, { tone: 'bad', candId: c.id, category: 'gaffe' });
  pushKeyEvent(game, { text: `${c.name} ${line}`, candId: c.id, impact: -hit });
}

/** Execute today's scheduled action for a candidate. */
export function executeAction(game: GameState, c: Candidate, a: ScheduledAction, rng: Rng) {
  const meta = SCHEDULE_META[a.kind];
  const mult = effectMult(game, c);
  const sf = staminaFactor(c);
  const st = a.state ? game.states[a.state] : undefined;
  const sName = a.state ? STATE_BY_CODE[a.state].name : '';
  if (meta.cost > 0) spend(c, meta.cost);
  c.stamina = clamp(c.stamina - meta.stamina, 0, 100);

  switch (a.kind) {
    case 'rally': {
      const gain = TUNING.rallyPresence * (0.6 + c.stats.charisma / 125) * sf * mult;
      st!.presence[c.id] = (st!.presence[c.id] ?? 0) + gain;
      c.enthusiasm = clamp(c.enthusiasm + 0.7, 0, 100);
      c.momentum += 0.006;
      c.totals.rallies += 1;
      if (c.isPlayer || rng.chance(0.25)) {
        const crowd = Math.round((4 + c.stats.charisma / 8 + c.momentum * 20) * rng.range(0.7, 1.3));
        pushNews(game, `${c.name}: wiec w stanie ${sName} przyciąga ok. ${Math.max(2, crowd)} tys. osób`, { candId: c.id, category: 'rally' });
      }
      gaffeCheck(game, c, rng, 1, sName);
      break;
    }
    case 'townhall': {
      const gain = TUNING.townhallPresence * sf * mult;
      st!.presence[c.id] = (st!.presence[c.id] ?? 0) + gain;
      c.favorability = clamp(c.favorability + 0.35 * (c.stats.integrity / 60) * sf, -50, 50);
      if (c.isPlayer) pushNews(game, `${c.name} odpowiada na pytania wyborców w stanie ${sName}`, { candId: c.id, category: 'rally' });
      gaffeCheck(game, c, rng, 0.5, sName);
      break;
    }
    case 'fundraiser': {
      const hub = a.state && DONOR_HUBS.has(a.state) ? 1.45 : 1;
      const raised = (1.4 + (c.stats.fundraising / 100) * 3.2) * hub * (1 + clamp(c.momentum, -0.5, 0.8) * 0.6) * sf * (c.isPlayer ? 1 : mult);
      c.funds += raised;
      c.totals.raised += raised;
      c.favorability = clamp(c.favorability - 0.12, -50, 50);
      if (c.isPlayer || raised > 6) pushNews(game, `${c.name} zbiera $${raised.toFixed(1)} mln na kolacji z darczyńcami (${sName})`, { candId: c.id, category: 'money', tone: 'good' });
      break;
    }
    case 'speech': {
      const issue = a.issue!;
      game.salienceShock[issue] += 0.28 * mult;
      const edge = issueEdge(game, c.id, issue);
      c.momentum += (0.012 + 0.05 * edge) * mult;
      pushNews(game, `${c.name} wygłasza przemówienie: ${ISSUE_BY_ID[issue].label.toLowerCase()}`, {
        candId: c.id,
        category: 'speech',
        tone: edge > 0.1 ? 'good' : edge < -0.1 ? 'bad' : 'neutral',
        body: edge > 0.1 ? 'Komentatorzy: to temat, na którym kandydat zyskuje.' : edge < -0.1 ? 'Eksperci: ryzykowny wybór tematu — większość wyborców myśli inaczej.' : undefined,
      });
      break;
    }
    case 'interview': {
      const delta = rng.normal(0.015 + (c.stats.charisma - 50) / 1600, 0.035) * mult;
      c.momentum += delta;
      c.favorability = clamp(c.favorability + rng.normal(0.25, 1.1), -50, 50);
      if (c.isPlayer || Math.abs(delta) > 0.05)
        pushNews(game, delta >= 0 ? `Udany wywiad: ${c.name} przekonuje w porannym programie` : `${c.name} gubi się w trudnym wywiadzie telewizyjnym`, {
          candId: c.id,
          tone: delta >= 0 ? 'good' : 'bad',
          category: 'media',
        });
      gaffeCheck(game, c, rng, 0.8);
      break;
    }
    case 'debatePrep':
      c.debatePrep = clamp(c.debatePrep + 30, 0, 100);
      break;
    case 'rest':
      break;
  }
}

// ---- money actions ----

export function adDailyCost(scope: string): number {
  if (scope === 'national') return TUNING.nationalAdDailyCost;
  const s = STATE_BY_CODE[scope];
  return TUNING.stateAdBaseDailyCost + s.vep * TUNING.stateAdPerVepDailyCost;
}

export function officeCost(code: string): number {
  return TUNING.officeBaseCost + STATE_BY_CODE[code].vep * TUNING.officePerVepCost;
}

export const AD_KIND_LABEL: Record<AdKind, string> = {
  positive: 'Pozytywna (wizerunkowa)',
  attack: 'Negatywna (atak)',
  issue: 'Tematyczna',
};

export function launchAd(
  game: GameState,
  candId: string,
  opts: { scope: string; kind: AdKind; days: number; issue?: IssueId; targetId?: string },
): string | null {
  const c = getCandidate(game, candId);
  const daily = adDailyCost(opts.scope);
  const total = daily * opts.days;
  if (c.funds < total) return `Brak środków: potrzeba $${total.toFixed(1)} mln.`;
  if (opts.kind === 'attack' && !opts.targetId) return 'Wybierz cel ataku.';
  if (opts.kind === 'issue' && !opts.issue) return 'Wybierz temat reklamy.';
  spend(c, total);
  c.totals.adsRun += 1;
  game.ads.push({
    id: nextId(game, 'ad'),
    candId,
    scope: opts.scope,
    kind: opts.kind,
    issue: opts.issue,
    targetId: opts.targetId,
    daysLeft: opts.days,
    dailyCost: daily,
  });
  if (c.isPlayer || opts.scope === 'national') {
    const where = opts.scope === 'national' ? 'w całym kraju' : `w stanie ${STATE_BY_CODE[opts.scope].name}`;
    const what = opts.kind === 'attack' ? `atakuje ${candName(game, opts.targetId)} w nowej reklamie` : opts.kind === 'issue' ? `emituje spot o temacie: ${ISSUE_BY_ID[opts.issue!].label.toLowerCase()}` : 'startuje z kampanią reklamową';
    pushNews(game, `${c.name} ${what} ${where}`, { candId, category: 'ads' });
  }
  return null;
}

export function openOffice(game: GameState, candId: string, code: string): string | null {
  const c = getCandidate(game, candId);
  const st = game.states[code];
  const level = st.offices[candId] ?? 0;
  if (level >= TUNING.maxOffices) return 'Maksymalna liczba biur w tym stanie.';
  const cost = officeCost(code);
  if (c.funds < cost) return `Brak środków: potrzeba $${cost.toFixed(1)} mln.`;
  spend(c, cost);
  st.offices[candId] = level + 1;
  if (c.isPlayer) pushNews(game, `Sztab ${c.name} otwiera biuro terenowe w stanie ${STATE_BY_CODE[code].name} (poziom ${level + 1})`, { candId, category: 'ground' });
  return null;
}

/** Run one day of every active ad campaign. */
export function processAds(game: GameState) {
  const nat = game.states.__national;
  for (const ad of game.ads) {
    const c = getCandidate(game, ad.candId);
    const mult = effectMult(game, c) * TUNING.adStrength;
    const rt = ad.scope === 'national' ? nat : game.states[ad.scope];
    if (ad.kind === 'attack' && ad.targetId) {
      rt.attacks[ad.targetId] = (rt.attacks[ad.targetId] ?? 0) + mult * 1.1;
      // Going negative costs a little goodwill.
      c.favorability = clamp(c.favorability - (ad.scope === 'national' ? 0.05 : 0.01), -50, 50);
    } else {
      rt.ads[c.id] = (rt.ads[c.id] ?? 0) + mult * (ad.kind === 'issue' ? 0.8 : 1);
      if (ad.kind === 'issue' && ad.issue) game.salienceShock[ad.issue] += ad.scope === 'national' ? 0.03 : 0.004;
      if (ad.scope === 'national') c.favorability = clamp(c.favorability + 0.05, -50, 50);
    }
    ad.daysLeft -= 1;
  }
  game.ads = game.ads.filter((a) => a.daysLeft > 0);
}
