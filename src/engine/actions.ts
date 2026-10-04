// Campaign actions shared by the player and AI candidates.
// Schedule actions consume one day of the candidate's time; media buys, door-to-door programs and
// field offices only cost money. Every dollar is booked in the candidate's ledger.

import { DONOR_HUBS, STATE_BY_CODE } from '../data/states';
import { ISSUE_BY_ID } from '../data/issues';
import { DIFFICULTY_MULT, TUNING } from './config';
import type { AdChannel, AdKind, Candidate, FundSource, GameState, IssueId, ScheduleKind, ScheduledAction, SpendCategory } from './types';
import type { Rng } from './rng';
import { clamp } from './util';
import { issueEdge } from './voterModel';
import { candName, nextId, pushKeyEvent, pushNews } from './news';

export const SCHEDULE_META: Record<ScheduleKind, { label: string; icon: string; needsState: boolean; needsIssue: boolean; cost: number; stamina: number; hint: string }> = {
  rally: { label: 'Wiec', icon: '📣', needsState: true, needsIssue: false, cost: TUNING.rallyCost, stamina: 14, hint: 'Mobilizuje bazę i buduje obecność w stanie. Ryzyko gafy przy zmęczeniu.' },
  townhall: { label: 'Spotkanie z wyborcami', icon: '🎙️', needsState: true, needsIssue: false, cost: TUNING.townhallCost, stamina: 9, hint: 'Mniejszy zasięg, ale poprawia wizerunek i przekonuje niezdecydowanych.' },
  fundraiser: { label: 'Zbiórka funduszy', icon: '💰', needsState: true, needsIssue: false, cost: 0, stamina: 7, hint: 'Kolacja z dużymi darczyńcami. Najlepiej w CA, NY, TX, FL, IL, MA…' },
  speech: { label: 'Przemówienie programowe', icon: '📜', needsState: false, needsIssue: true, cost: 0.05, stamina: 8, hint: 'Podbija znaczenie tematu w mediach. Opłaca się, gdy Twoje stanowisko jest popularne.' },
  interview: { label: 'Wywiad w mediach', icon: '📺', needsState: false, needsIssue: false, cost: 0, stamina: 8, hint: 'Ogólnokrajowy zasięg. Wynik zależy od umiejętności medialnych.' },
  socialBlitz: { label: 'Dzień w social media', icon: '📱', needsState: false, needsIssue: false, cost: 0.08, stamina: 6, hint: 'Livestreamy, wywiady z influencerami, krótkie filmy. Buduje buzz wśród młodych; szansa na viral.' },
  debatePrep: { label: 'Przygotowanie do debaty', icon: '🧠', needsState: false, needsIssue: false, cost: 0.05, stamina: 5, hint: 'Zwiększa szanse w najbliższej debacie (+30 przygotowania).' },
  rest: { label: 'Odpoczynek', icon: '🛌', needsState: false, needsIssue: false, cost: 0, stamina: -35, hint: 'Regeneruje kondycję kandydata (+35).' },
};

export const SPEND_LABEL: Record<SpendCategory, string> = {
  tv: 'Reklamy TV',
  digital: 'Kampania internetowa',
  ground: 'Teren (door-to-door, biura)',
  travel: 'Podróże',
  events: 'Wiece i wydarzenia',
  staff: 'Sztab i personel',
};

export const FUND_LABEL: Record<FundSource, string> = {
  small: 'Drobni darczyńcy online',
  major: 'Duzi darczyńcy',
  pac: 'Super PAC-i',
  events: 'Kolacje i zbiórki',
  party: 'Komitet partii',
};

export function emptyLedger() {
  return {
    raised: { small: 0, major: 0, pac: 0, events: 0, party: 0 } as Record<FundSource, number>,
    spent: { tv: 0, digital: 0, ground: 0, travel: 0, events: 0, staff: 0 } as Record<SpendCategory, number>,
  };
}

export function getCandidate(game: GameState, id: string): Candidate {
  const c = game.candidates.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown candidate ${id}`);
  return c;
}

export function effectMult(game: GameState, c: Candidate) {
  return c.isPlayer ? 1 : DIFFICULTY_MULT[game.settings.difficulty].ai;
}

function staminaFactor(c: Candidate) {
  return 0.55 + c.stamina / 220;
}

export function spend(c: Candidate, amount: number, cat: SpendCategory) {
  c.funds -= amount;
  c.totals.spent += amount;
  c.ledger.spent[cat] += amount;
}

export function earn(c: Candidate, amount: number, source: FundSource) {
  c.funds += amount;
  c.totals.raised += amount;
  c.ledger.raised[source] += amount;
}

/** Cost of flying the candidate (and press corps) to a state. */
export function travelCost(from: string, to: string): number {
  if (from === to) return 0.02;
  const a = STATE_BY_CODE[from];
  const b = STATE_BY_CODE[to];
  if (!a || !b) return 0.1;
  return a.region === b.region ? 0.07 : 0.16;
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
  const p = (0.01 + ((100 - c.stats.discipline) / 100) * 0.04 + (c.stamina < 30 ? 0.05 : 0)) * riskMult;
  if (!rng.chance(p)) return;
  const hit = rng.range(1.5, 3.5) * (0.7 + c.stats.scandalRisk / 160);
  c.favorability -= hit;
  c.momentum -= 0.05;
  c.social.buzz = clamp(c.social.buzz - 0.15, -1, 1);
  const lines = [
    'myli nazwę stanu na wiecu',
    'wygłasza niefortunny komentarz o wyborcach przeciwnika',
    'na nagraniu krytykuje własnych doradców',
    'zalicza wpadkę z liczbami podczas wystąpienia',
    'żartuje w sposób uznany za obraźliwy',
  ];
  const line = rng.pick(lines);
  pushNews(game, `Gafa: ${c.name} ${line}${where ? ` (${where})` : ''}`, { tone: 'bad', candId: c.id, category: 'gaffe', severity: hit > 3 ? 'moderate' : 'minor' });
  if (hit > 2.5) pushKeyEvent(game, { text: `${c.name} ${line}`, candId: c.id, impact: -hit });
}

/** Execute today's scheduled action for a candidate. */
export function executeAction(game: GameState, c: Candidate, a: ScheduledAction, rng: Rng) {
  const meta = SCHEDULE_META[a.kind];
  const mult = effectMult(game, c);
  const sf = staminaFactor(c);
  const st = a.state ? game.states[a.state] : undefined;
  const sName = a.state ? STATE_BY_CODE[a.state].name : '';
  if (a.state) {
    spend(c, travelCost(c.location, a.state), 'travel');
    c.location = a.state;
  }
  if (meta.cost > 0) spend(c, meta.cost, a.kind === 'socialBlitz' ? 'digital' : 'events');
  c.stamina = clamp(c.stamina - meta.stamina, 0, 100);

  switch (a.kind) {
    case 'rally': {
      const gain = TUNING.rallyPresence * (0.5 + c.stats.charisma / 150 + c.stats.campaign / 300) * sf * mult;
      st!.presence[c.id] = (st!.presence[c.id] ?? 0) + gain;
      c.enthusiasm = clamp(c.enthusiasm + 0.5 + c.stats.grassroots / 200, 0, 100);
      c.momentum += 0.005;
      c.social.buzz = clamp(c.social.buzz + 0.02, -1, 1);
      c.totals.rallies += 1;
      if (c.isPlayer || rng.chance(0.2)) {
        const crowd = Math.round((4 + c.stats.charisma / 8 + c.stats.grassroots / 12 + c.momentum * 20) * rng.range(0.7, 1.3));
        pushNews(game, `${c.name}: wiec w stanie ${sName} przyciąga ok. ${Math.max(2, crowd)} tys. osób`, { candId: c.id, category: 'rally' });
      }
      gaffeCheck(game, c, rng, 1, sName);
      break;
    }
    case 'townhall': {
      const gain = TUNING.townhallPresence * (0.8 + c.stats.campaign / 250) * sf * mult;
      st!.presence[c.id] = (st!.presence[c.id] ?? 0) + gain;
      st!.eventMod[c.id] = (st!.eventMod[c.id] ?? 0) + 0.004 * (c.stats.integrity / 60);
      c.favorability = clamp(c.favorability + 0.3 * (c.stats.integrity / 60) * sf, -50, 50);
      if (c.isPlayer) pushNews(game, `${c.name} odpowiada na pytania wyborców w stanie ${sName}`, { candId: c.id, category: 'rally' });
      gaffeCheck(game, c, rng, 0.5, sName);
      break;
    }
    case 'fundraiser': {
      const hub = a.state && DONOR_HUBS.has(a.state) ? 1.45 : 1;
      const raised = (1.2 + (c.stats.fundraising / 100) * 3) * hub * (1 + clamp(c.momentum, -0.5, 0.8) * 0.6) * sf * (c.isPlayer ? 1 : mult);
      earn(c, raised, 'events');
      c.favorability = clamp(c.favorability - 0.12, -50, 50);
      if (c.isPlayer || raised > 6) pushNews(game, `${c.name} zbiera $${raised.toFixed(1)} mln na kolacji z darczyńcami (${sName})`, { candId: c.id, category: 'money', tone: 'good' });
      break;
    }
    case 'speech': {
      const issue = a.issue!;
      game.salienceShock[issue] += 0.28 * mult;
      const edge = issueEdge(game, c.id, issue);
      c.momentum += (0.01 + 0.05 * edge) * mult * (0.8 + c.stats.charisma / 250);
      pushNews(game, `${c.name} wygłasza przemówienie: ${ISSUE_BY_ID[issue].label.toLowerCase()}`, {
        candId: c.id,
        category: 'speech',
        tone: edge > 0.1 ? 'good' : edge < -0.1 ? 'bad' : 'neutral',
        severity: Math.abs(edge) > 0.3 ? 'moderate' : 'minor',
        body: edge > 0.1 ? 'Komentatorzy: to temat, na którym kandydat zyskuje.' : edge < -0.1 ? 'Eksperci: ryzykowny wybór tematu — większość wyborców myśli inaczej.' : undefined,
      });
      break;
    }
    case 'interview': {
      const delta = rng.normal(0.012 + (c.stats.media - 50) / 1500 + (c.stats.charisma - 50) / 3000, 0.032) * mult;
      c.momentum += delta;
      c.favorability = clamp(c.favorability + rng.normal(0.2, 1), -50, 50);
      if (c.isPlayer || Math.abs(delta) > 0.05)
        pushNews(game, delta >= 0 ? `Udany wywiad: ${c.name} przekonuje w porannym programie` : `${c.name} gubi się w trudnym wywiadzie telewizyjnym`, {
          candId: c.id,
          tone: delta >= 0 ? 'good' : 'bad',
          category: 'media',
        });
      gaffeCheck(game, c, rng, 0.8);
      break;
    }
    case 'socialBlitz': {
      const gain = (0.12 + c.stats.media / 600) * sf * mult;
      c.social.buzz = clamp(c.social.buzz + gain, -1, 1);
      c.social.followers *= 1.01 + c.stats.media / 10000;
      c.social.engagement = clamp(c.social.engagement + 0.4, 0.5, 12);
      game.states.__national.digital[c.id] = (game.states.__national.digital[c.id] ?? 0) + 0.25 * mult;
      if (c.isPlayer) pushNews(game, `${c.name} spędza dzień na livestreamach i rozmowach z twórcami internetowymi`, { candId: c.id, category: 'social' });
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

export const CHANNEL_LABEL: Record<AdChannel, string> = {
  tv: 'Reklama TV',
  digital: 'Kampania internetowa',
  canvass: 'Door-to-door',
};

/** Cost of a "standard" day of presence in a media market — the unit of diminishing returns. */
export function marketUnit(channel: AdChannel, scope: string): number {
  if (scope === 'national') return channel === 'tv' ? 1.0 : 0.35;
  const v = STATE_BY_CODE[scope].vep;
  if (channel === 'tv') return 0.02 + v * 0.012;
  if (channel === 'digital') return 0.008 + v * 0.004;
  return 0.01 + v * 0.006;
}

const CHANNEL_STRENGTH: Record<AdChannel, number> = { tv: 0.45, digital: 0.42, canvass: 0.35 };

/** Daily stock a given budget buys. log1p → every extra million buys less than the previous one. */
export function mediaIntensity(c: Candidate, channel: AdChannel, scope: string, amount: number, days: number, mult = 1): number {
  const daily = amount / Math.max(1, days);
  let skill = 1;
  if (channel === 'canvass') skill = 0.7 + c.stats.campaign / 250 + c.stats.grassroots / 400;
  if (channel === 'digital') skill = 0.8 + c.stats.media / 250;
  return CHANNEL_STRENGTH[channel] * Math.log1p(daily / marketUnit(channel, scope)) * skill * mult;
}

/** A sensible default budget for a week-long buy (≈1.6 standard days of presence per day). */
export function suggestedBudget(channel: AdChannel, scope: string, days = 7): number {
  return Math.round(marketUnit(channel, scope) * 1.6 * days * 10) / 10;
}

/** Market saturation 0..1 for UI hints: how much of the max useful stock is already there. */
export function saturation(game: GameState, candId: string, channel: AdChannel, scope: string): number {
  const rt = scope === 'national' ? game.states.__national : game.states[scope];
  const stock = channel === 'tv' ? rt.ads[candId] ?? 0 : channel === 'digital' ? rt.digital[candId] ?? 0 : rt.canvass[candId] ?? 0;
  return clamp(stock / 12, 0, 1);
}

export interface MediaBuy {
  channel: AdChannel;
  scope: string;
  kind: AdKind;
  amount: number; // $M total
  days: number;
  issue?: IssueId;
  targetId?: string;
}

export function buyMedia(game: GameState, candId: string, buy: MediaBuy): string | null {
  const c = getCandidate(game, candId);
  if (buy.amount <= 0) return 'Podaj kwotę.';
  if (c.funds < buy.amount) return `Brak środków: potrzeba $${buy.amount.toFixed(1)} mln.`;
  if (buy.channel === 'canvass' && buy.scope === 'national') return 'Door-to-door prowadzi się w konkretnych stanach.';
  if (buy.kind === 'attack' && !buy.targetId) return 'Wybierz cel ataku.';
  if (buy.kind === 'issue' && !buy.issue) return 'Wybierz temat reklamy.';
  const kind: AdKind = buy.channel === 'canvass' ? 'positive' : buy.kind;
  spend(c, buy.amount, buy.channel === 'canvass' ? 'ground' : buy.channel);
  c.totals.adsRun += 1;
  game.ads.push({
    id: nextId(game, 'ad'),
    candId,
    scope: buy.scope,
    channel: buy.channel,
    kind,
    intensity: mediaIntensity(c, buy.channel, buy.scope, buy.amount, buy.days, effectMult(game, c)),
    budget: buy.amount,
    issue: buy.issue,
    targetId: buy.targetId,
    daysLeft: buy.days,
    dailyCost: buy.amount / buy.days,
  });
  if (c.isPlayer || (buy.scope === 'national' && buy.channel === 'tv') || buy.amount >= 8) {
    const where = buy.scope === 'national' ? 'w całym kraju' : `w stanie ${STATE_BY_CODE[buy.scope].name}`;
    let what: string;
    if (buy.channel === 'canvass') what = `wysyła wolontariuszy od drzwi do drzwi (${fmtM(buy.amount)})`;
    else if (kind === 'attack') what = `atakuje ${candName(game, buy.targetId)} w ${buy.channel === 'tv' ? 'spocie telewizyjnym' : 'kampanii internetowej'} (${fmtM(buy.amount)})`;
    else if (kind === 'issue') what = `emituje ${buy.channel === 'tv' ? 'spoty' : 'reklamy online'} o temacie: ${ISSUE_BY_ID[buy.issue!].label.toLowerCase()} (${fmtM(buy.amount)})`;
    else what = `startuje z ${buy.channel === 'tv' ? 'kampanią telewizyjną' : 'kampanią internetową'} (${fmtM(buy.amount)})`;
    pushNews(game, `${c.name} ${what} ${where}`, { candId, category: 'ads' });
  }
  return null;
}

function fmtM(v: number) {
  return `$${v.toFixed(v < 10 ? 1 : 0)} mln`;
}

export function officeCost(code: string): number {
  return TUNING.officeBaseCost + STATE_BY_CODE[code].vep * TUNING.officePerVepCost;
}

export const AD_KIND_LABEL: Record<AdKind, string> = {
  positive: 'Pozytywna (wizerunkowa)',
  attack: 'Negatywna (atak)',
  issue: 'Tematyczna',
};

export function openOffice(game: GameState, candId: string, code: string): string | null {
  const c = getCandidate(game, candId);
  const st = game.states[code];
  const level = st.offices[candId] ?? 0;
  if (level >= TUNING.maxOffices) return 'Maksymalna liczba biur w tym stanie.';
  const cost = officeCost(code);
  if (c.funds < cost) return `Brak środków: potrzeba $${cost.toFixed(1)} mln.`;
  spend(c, cost, 'ground');
  st.offices[candId] = level + 1;
  if (c.isPlayer) pushNews(game, `Sztab ${c.name} otwiera biuro terenowe w stanie ${STATE_BY_CODE[code].name} (poziom ${level + 1})`, { candId, category: 'ground' });
  return null;
}

/** Run one day of every active media buy / ground program. */
export function processAds(game: GameState) {
  const nat = game.states.__national;
  for (const ad of game.ads) {
    const c = getCandidate(game, ad.candId);
    const rt = ad.scope === 'national' ? nat : game.states[ad.scope];
    const k = ad.intensity;
    if (ad.channel === 'canvass') {
      rt.canvass[c.id] = (rt.canvass[c.id] ?? 0) + k;
    } else if (ad.kind === 'attack' && ad.targetId) {
      rt.attacks[ad.targetId] = (rt.attacks[ad.targetId] ?? 0) + k * (ad.channel === 'tv' ? 1.1 : 0.8);
      // Going negative costs a little goodwill.
      c.favorability = clamp(c.favorability - (ad.scope === 'national' ? 0.05 : 0.01), -50, 50);
      if (ad.channel === 'digital') {
        const t = game.candidates.find((x) => x.id === ad.targetId);
        if (t) t.social.buzz = clamp(t.social.buzz - 0.004 * k, -1, 1);
      }
    } else {
      const store = ad.channel === 'tv' ? rt.ads : rt.digital;
      store[c.id] = (store[c.id] ?? 0) + k * (ad.kind === 'issue' ? 0.8 : 1);
      if (ad.kind === 'issue' && ad.issue) game.salienceShock[ad.issue] += ad.scope === 'national' ? 0.03 : 0.004;
      if (ad.scope === 'national' && ad.channel === 'tv') c.favorability = clamp(c.favorability + 0.04, -50, 50);
    }
    if (ad.channel === 'digital') {
      c.social.followers *= 1 + 0.0006 * k;
      c.social.buzz = clamp(c.social.buzz + 0.003 * k, -1, 1);
    }
    ad.daysLeft -= 1;
  }
  game.ads = game.ads.filter((a) => a.daysLeft > 0);
}
