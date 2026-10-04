// Campaign actions shared by the player and AI candidates.
// Schedule actions consume one day of the candidate's time; media buys, door-to-door programs and
// field offices only cost money. Every dollar is booked in the candidate's ledger.

import { DONOR_HUBS, STATE_BY_CODE, stateName } from '../data/states';
import { bi, L, loc, same, type LStr } from '../i18n';
import { ISSUE_BY_ID } from '../data/issues';
import { DIFFICULTY_MULT, TUNING } from './config';
import type { AdChannel, AdKind, Candidate, FundSource, GameState, IssueId, ScheduleKind, ScheduledAction, SpendCategory } from './types';
import type { Rng } from './rng';
import { clamp, moneyL } from './util';
import { issueEdge } from './voterModel';
import { candName, nextId, pushKeyEvent, pushNews } from './news';

export const SCHEDULE_META: Record<ScheduleKind, { label: LStr; icon: string; needsState: boolean; needsIssue: boolean; cost: number; stamina: number; hint: LStr }> = {
  rally: { label: L('Wiec', 'Rally'), icon: '📣', needsState: true, needsIssue: false, cost: TUNING.rallyCost, stamina: 14, hint: L('Mobilizuje bazę i buduje obecność w stanie. Ryzyko gafy przy zmęczeniu.', 'Fires up the base and builds presence in the state. Risk of gaffes when tired.') },
  townhall: { label: L('Spotkanie z wyborcami', 'Town hall'), icon: '🎙️', needsState: true, needsIssue: false, cost: TUNING.townhallCost, stamina: 9, hint: L('Mniejszy zasięg, ale poprawia wizerunek i przekonuje niezdecydowanych.', 'Smaller reach, but improves your image and persuades undecided voters.') },
  fundraiser: { label: L('Zbiórka funduszy', 'Fundraiser'), icon: '💰', needsState: true, needsIssue: false, cost: 0, stamina: 7, hint: L('Kolacja z dużymi darczyńcami. Najlepiej w Kalifornii, Nowym Jorku, Teksasie, na Florydzie…', 'Dinner with big donors. Best in CA, NY, TX, FL, IL, MA…') },
  speech: { label: L('Przemówienie programowe', 'Policy speech'), icon: '📜', needsState: false, needsIssue: true, cost: 0.05, stamina: 8, hint: L('Podbija znaczenie tematu w mediach. Opłaca się, gdy Twoje stanowisko jest popularne.', 'Raises the issue in the media. Pays off when your position is popular.') },
  interview: { label: L('Wywiad w mediach', 'Media interview'), icon: '📺', needsState: false, needsIssue: false, cost: 0, stamina: 8, hint: L('Ogólnokrajowy zasięg. Wynik zależy od umiejętności medialnych.', 'National reach. The outcome depends on media skill.') },
  socialBlitz: { label: L('Dzień w mediach społecznościowych', 'Social media day'), icon: '📱', needsState: false, needsIssue: false, cost: 0.08, stamina: 6, hint: L('Transmisje na żywo, rozmowy z twórcami internetowymi, krótkie filmy. Buduje rozgłos wśród młodych; szansa na wiral.', 'Livestreams, creator interviews, short videos. Builds buzz with young voters; chance of going viral.') },
  debatePrep: { label: L('Przygotowanie do debaty', 'Debate prep'), icon: '🧠', needsState: false, needsIssue: false, cost: 0.05, stamina: 5, hint: L('Zwiększa szanse w najbliższej debacie (+30 przygotowania).', 'Improves your odds in the next debate (+30 prep).') },
  rest: { label: L('Odpoczynek', 'Rest'), icon: '🛌', needsState: false, needsIssue: false, cost: 0, stamina: -35, hint: L('Regeneruje kondycję kandydata (+35).', 'Restores the candidate’s stamina (+35).') },
};

export const SPEND_LABEL: Record<SpendCategory, LStr> = {
  tv: L('Reklamy telewizyjne', 'TV ads'),
  digital: L('Kampania internetowa', 'Digital campaign'),
  ground: L('Teren (od drzwi do drzwi, biura)', 'Field (door-knocking, offices)'),
  travel: L('Podróże', 'Travel'),
  events: L('Wiece i wydarzenia', 'Rallies & events'),
  staff: L('Sztab i personel', 'Staff & payroll'),
};

export const FUND_LABEL: Record<FundSource, LStr> = {
  small: L('Drobni darczyńcy w internecie', 'Small online donors'),
  major: L('Duzi darczyńcy', 'Major donors'),
  pac: L('Komitety Super PAC', 'Super PACs'),
  events: L('Kolacje i zbiórki', 'Fundraising dinners'),
  party: L('Komitet partii', 'Party committee'),
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

export function addToSchedule(game: GameState, candId: string, kind: ScheduleKind, opts: { state?: string; issue?: IssueId } = {}): LStr | null {
  const c = getCandidate(game, candId);
  if (c.schedule.length >= TUNING.maxScheduleLength) return L('Harmonogram jest pełny (maks. 7 dni).', 'The schedule is full (max 7 days).');
  const meta = SCHEDULE_META[kind];
  if (meta.needsState && !opts.state) return L('Wybierz stan.', 'Choose a state.');
  if (meta.needsIssue && !opts.issue) return L('Wybierz temat.', 'Choose an issue.');
  const action: ScheduledAction = { id: nextId(game, 'a'), kind, state: opts.state, issue: opts.issue };
  c.schedule.push(action);
  return null;
}

export function removeFromSchedule(game: GameState, candId: string, actionId: string) {
  const c = getCandidate(game, candId);
  c.schedule = c.schedule.filter((a) => a.id !== actionId);
}

function gaffeCheck(game: GameState, c: Candidate, rng: Rng, riskMult: number, where?: LStr) {
  const p = (0.01 + ((100 - c.stats.discipline) / 100) * 0.04 + (c.stamina < 30 ? 0.05 : 0)) * riskMult;
  if (!rng.chance(p)) return;
  const hit = rng.range(1.5, 3.5) * (0.7 + c.stats.scandalRisk / 160);
  c.favorability -= hit;
  c.momentum -= 0.05;
  c.social.buzz = clamp(c.social.buzz - 0.15, -1, 1);
  const lines = [
    L('myli nazwę stanu na wiecu', 'gets the state’s name wrong at a rally'),
    L('wygłasza niefortunny komentarz o wyborcach przeciwnika', 'makes an unfortunate remark about the opponent’s voters'),
    L('na nagraniu krytykuje własnych doradców', 'is caught on tape criticizing their own advisers'),
    L('zalicza wpadkę z liczbami podczas wystąpienia', 'botches the numbers during a speech'),
    L('żartuje w sposób uznany za obraźliwy', 'makes a joke widely seen as offensive'),
  ];
  const line = rng.pick(lines);
  pushNews(game, bi((l) => `${l === 'pl' ? 'Gafa' : 'Gaffe'}: ${c.name} ${line[l]}${where ? ` (${loc(where, l)})` : ''}`), { tone: 'bad', candId: c.id, category: 'gaffe', severity: hit > 3 ? 'moderate' : 'minor' });
  if (hit > 2.5) pushKeyEvent(game, { text: bi((l) => `${c.name} ${line[l]}`), candId: c.id, impact: -hit });
}

/** Execute today's scheduled action for a candidate. */
export function executeAction(game: GameState, c: Candidate, a: ScheduledAction, rng: Rng) {
  const meta = SCHEDULE_META[a.kind];
  const mult = effectMult(game, c);
  const sf = staminaFactor(c);
  const st = a.state ? game.states[a.state] : undefined;
  const sName: LStr = a.state ? stateName(a.state) : same('');
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
        const n = Math.max(2, crowd);
        pushNews(game, L(`${c.name}: wiec w stanie ${sName.pl} przyciąga ok. ${n} tys. osób`, `${c.name}: rally in ${sName.en} draws about ${n},000 people`), { candId: c.id, category: 'rally' });
      }
      gaffeCheck(game, c, rng, 1, sName);
      break;
    }
    case 'townhall': {
      const gain = TUNING.townhallPresence * (0.8 + c.stats.campaign / 250) * sf * mult;
      st!.presence[c.id] = (st!.presence[c.id] ?? 0) + gain;
      st!.eventMod[c.id] = (st!.eventMod[c.id] ?? 0) + 0.004 * (c.stats.integrity / 60);
      c.favorability = clamp(c.favorability + 0.3 * (c.stats.integrity / 60) * sf, -50, 50);
      if (c.isPlayer) pushNews(game, L(`${c.name} odpowiada na pytania wyborców w stanie ${sName.pl}`, `${c.name} takes voters’ questions at a town hall in ${sName.en}`), { candId: c.id, category: 'rally' });
      gaffeCheck(game, c, rng, 0.5, sName);
      break;
    }
    case 'fundraiser': {
      const hub = a.state && DONOR_HUBS.has(a.state) ? 1.45 : 1;
      const raised = (1.2 + (c.stats.fundraising / 100) * 3) * hub * (1 + clamp(c.momentum, -0.5, 0.8) * 0.6) * sf * (c.isPlayer ? 1 : mult);
      earn(c, raised, 'events');
      c.favorability = clamp(c.favorability - 0.12, -50, 50);
      if (c.isPlayer || raised > 6) pushNews(game, L(`${c.name} zbiera $${raised.toFixed(1)} mln na kolacji z darczyńcami (${sName.pl})`, `${c.name} raises $${raised.toFixed(1)}M at a donor dinner (${sName.en})`), { candId: c.id, category: 'money', tone: 'good' });
      break;
    }
    case 'speech': {
      const issue = a.issue!;
      game.salienceShock[issue] += 0.28 * mult;
      const edge = issueEdge(game, c.id, issue);
      c.momentum += (0.01 + 0.05 * edge) * mult * (0.8 + c.stats.charisma / 250);
      const lab = ISSUE_BY_ID[issue].label;
      pushNews(game, L(`${c.name} wygłasza przemówienie: ${lab.pl.toLowerCase()}`, `${c.name} gives a speech on ${lab.en.toLowerCase()}`), {
        candId: c.id,
        category: 'speech',
        tone: edge > 0.1 ? 'good' : edge < -0.1 ? 'bad' : 'neutral',
        severity: Math.abs(edge) > 0.3 ? 'moderate' : 'minor',
        body:
          edge > 0.1
            ? L('Komentatorzy: to temat, na którym kandydat zyskuje.', 'Pundits: this is an issue where the candidate gains.')
            : edge < -0.1
              ? L('Eksperci: ryzykowny wybór tematu — większość wyborców myśli inaczej.', 'Experts: a risky choice — most voters disagree.')
              : undefined,
      });
      break;
    }
    case 'interview': {
      const delta = rng.normal(0.012 + (c.stats.media - 50) / 1500 + (c.stats.charisma - 50) / 3000, 0.032) * mult;
      c.momentum += delta;
      c.favorability = clamp(c.favorability + rng.normal(0.2, 1), -50, 50);
      if (c.isPlayer || Math.abs(delta) > 0.05)
        pushNews(game, delta >= 0 ? L(`Udany wywiad: ${c.name} przekonuje w porannym programie`, `Strong interview: ${c.name} wins over a morning-show audience`) : L(`${c.name} gubi się w trudnym wywiadzie telewizyjnym`, `${c.name} stumbles in a tough TV interview`), {
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
      if (c.isPlayer) pushNews(game, L(`${c.name} spędza dzień na transmisjach na żywo i rozmowach z twórcami internetowymi`, `${c.name} spends the day livestreaming and talking to online creators`), { candId: c.id, category: 'social' });
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

export const CHANNEL_LABEL: Record<AdChannel, LStr> = {
  tv: L('Reklama telewizyjna', 'TV ad'),
  digital: L('Kampania internetowa', 'Digital campaign'),
  canvass: L('Od drzwi do drzwi', 'Door-to-door'),
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

export function buyMedia(game: GameState, candId: string, buy: MediaBuy): LStr | null {
  const c = getCandidate(game, candId);
  if (buy.amount <= 0) return L('Podaj kwotę.', 'Enter an amount.');
  if (c.funds < buy.amount) return notEnough(buy.amount);
  if (buy.channel === 'canvass' && buy.scope === 'national') return L('Agitację od drzwi do drzwi prowadzi się w konkretnych stanach.', 'Door-knocking is run in specific states.');
  if (buy.kind === 'attack' && !buy.targetId) return L('Wybierz cel ataku.', 'Choose a target.');
  if (buy.kind === 'issue' && !buy.issue) return L('Wybierz temat reklamy.', 'Choose an issue for the ad.');
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
    const money = moneyL(buy.amount);
    const where = buy.scope === 'national' ? L('w całym kraju', 'nationwide') : bi((l) => (l === 'pl' ? `w stanie ${stateName(buy.scope).pl}` : `in ${stateName(buy.scope).en}`));
    const target = candName(game, buy.targetId);
    const issueL = buy.issue ? ISSUE_BY_ID[buy.issue].label : same('');
    const tv = buy.channel === 'tv';
    let what: LStr;
    if (buy.channel === 'canvass') what = L(`wysyła wolontariuszy od drzwi do drzwi (${money.pl})`, `sends volunteers door-to-door (${money.en})`);
    else if (kind === 'attack') what = L(`atakuje ${target} w ${tv ? 'spocie telewizyjnym' : 'kampanii internetowej'} (${money.pl})`, `attacks ${target} in ${tv ? 'a TV spot' : 'an online campaign'} (${money.en})`);
    else if (kind === 'issue') what = L(`emituje ${tv ? 'spoty' : 'reklamy internetowe'} o temacie: ${issueL.pl.toLowerCase()} (${money.pl})`, `runs ${tv ? 'TV spots' : 'online ads'} on ${issueL.en.toLowerCase()} (${money.en})`);
    else what = L(`startuje z ${tv ? 'kampanią telewizyjną' : 'kampanią internetową'} (${money.pl})`, `launches ${tv ? 'a TV campaign' : 'an online campaign'} (${money.en})`);
    pushNews(game, bi((l) => `${c.name} ${what[l]} ${where[l]}`), { candId, category: 'ads' });
  }
  return null;
}

function notEnough(amount: number): LStr {
  return L(`Brak środków: potrzeba $${amount.toFixed(1)} mln.`, `Not enough funds: $${amount.toFixed(1)}M needed.`);
}


export function officeCost(code: string): number {
  return TUNING.officeBaseCost + STATE_BY_CODE[code].vep * TUNING.officePerVepCost;
}

export const AD_KIND_LABEL: Record<AdKind, LStr> = {
  positive: L('Pozytywna', 'Positive'),
  attack: L('Atak', 'Attack'),
  issue: L('Tematyczna', 'Issue'),
};

export function openOffice(game: GameState, candId: string, code: string): LStr | null {
  const c = getCandidate(game, candId);
  const st = game.states[code];
  const level = st.offices[candId] ?? 0;
  if (level >= TUNING.maxOffices) return L('Maksymalna liczba biur w tym stanie.', 'Maximum number of offices in this state.');
  const cost = officeCost(code);
  if (c.funds < cost) return notEnough(cost);
  spend(c, cost, 'ground');
  st.offices[candId] = level + 1;
  if (c.isPlayer) pushNews(game, L(`Sztab ${c.name} otwiera biuro terenowe w stanie ${stateName(code).pl} (poziom ${level + 1})`, `${c.name}’s campaign opens a field office in ${stateName(code).en} (level ${level + 1})`), { candId, category: 'ground' });
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
