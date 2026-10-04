import type { AiStyle, CandidateStats, ProfileId, TraitId } from '../engine/types';
import { L, type LStr } from '../i18n';

export interface ProfileDef {
  id: ProfileId;
  label: LStr;
  description: LStr;
  stats: CandidateStats;
  /** Default campaign behaviour of an AI candidate with this background. */
  style: AiStyle;
  fundsBonus: number; // $M added at start
  flavor: LStr; // used by the platform generator
}

export const PROFILES: Record<ProfileId, ProfileDef> = {
  governor: {
    id: 'governor',
    label: L('Gubernator', 'Governor'),
    description: L('Doświadczony administrator stanowy. Zrównoważone statystyki, silny w stanie rodzinnym.', 'Experienced state executive. Balanced stats, strong in the home state.'),
    stats: { charisma: 60, debate: 60, experience: 75, integrity: 60, fundraising: 60, discipline: 65, campaign: 68, media: 55, grassroots: 55, scandalRisk: 40 },
    style: 'balanced',
    fundsBonus: 5,
    flavor: L('Jako gubernator udowodniłem, że potrafię rządzić skutecznie i ponad podziałami.', 'As governor I proved I can govern effectively and across party lines.'),
  },
  senator: {
    id: 'senator',
    label: L('Senator', 'Senator'),
    description: L('Weteran Waszyngtonu. Świetny w debatach i polityce zagranicznej, ale obciążony „bagażem” głosowań.', 'Washington veteran. Great at debates and foreign policy, but carries a voting-record baggage.'),
    stats: { charisma: 55, debate: 72, experience: 80, integrity: 52, fundraising: 68, discipline: 62, campaign: 62, media: 52, grassroots: 45, scandalRisk: 50 },
    style: 'establishment',
    fundsBonus: 8,
    flavor: L('Przez lata w Senacie walczyłem o sprawy zwykłych Amerykanów.', 'For years in the Senate I fought for ordinary Americans.'),
  },
  business: {
    id: 'business',
    label: L('Przedsiębiorca', 'Business leader'),
    description: L('Outsider z wielkiego biznesu. Ogromne fundusze, słabsze doświadczenie i dyscyplina.', 'Big-business outsider. Huge war chest, weaker experience and discipline.'),
    stats: { charisma: 65, debate: 50, experience: 35, integrity: 45, fundraising: 85, discipline: 45, campaign: 60, media: 65, grassroots: 40, scandalRisk: 68 },
    style: 'aggressive',
    fundsBonus: 25,
    flavor: L('Zbudowałem firmę od zera — teraz naprawię Amerykę tak, jak naprawiałem biznes.', 'I built a company from scratch — now I will fix America the way I fixed businesses.'),
  },
  general: {
    id: 'general',
    label: L('Generał w stanie spoczynku', 'Retired general'),
    description: L('Bohater wojenny. Wysoka wiarygodność i dyscyplina, przewaga w bezpieczeństwie.', 'War hero. High credibility and discipline, an edge on security.'),
    stats: { charisma: 55, debate: 50, experience: 60, integrity: 80, fundraising: 50, discipline: 80, campaign: 70, media: 42, grassroots: 50, scandalRisk: 22 },
    style: 'establishment',
    fundsBonus: 0,
    flavor: L('Służyłem temu krajowi w mundurze. Teraz chcę mu służyć jako głównodowodzący.', 'I served this country in uniform. Now I want to serve it as Commander-in-Chief.'),
  },
  activist: {
    id: 'activist',
    label: L('Aktywista', 'Activist'),
    description: L('Lider ruchu społecznego. Porywa tłumy i entuzjazm, ale zbiera mniej pieniędzy.', 'Leader of a social movement. Energizes crowds, but raises less money.'),
    stats: { charisma: 75, debate: 60, experience: 35, integrity: 72, fundraising: 45, discipline: 55, campaign: 58, media: 70, grassroots: 85, scandalRisk: 35 },
    style: 'grassroots',
    fundsBonus: -3,
    flavor: L('Wyrosłem z ruchu oddolnego — to głos ludzi, nie lobbystów, zaprowadzi mnie do Białego Domu.', 'I come from a grassroots movement — the voice of the people, not lobbyists, will take me to the White House.'),
  },
  celebrity: {
    id: 'celebrity',
    label: L('Celebryta', 'Celebrity'),
    description: L('Gwiazda mediów. Charyzma i rozpoznawalność, ale łatwo o gafy i skandale.', 'Media star. Charisma and name recognition, but prone to gaffes and scandals.'),
    stats: { charisma: 88, debate: 52, experience: 20, integrity: 48, fundraising: 70, discipline: 35, campaign: 45, media: 90, grassroots: 60, scandalRisk: 72 },
    style: 'media',
    fundsBonus: 10,
    flavor: L('Ameryka mnie zna. Wiem, jak rozmawiać z ludźmi, których elity ignorują.', 'America knows me. I know how to talk to the people the elites ignore.'),
  },
  mayor: {
    id: 'mayor',
    label: L('Burmistrz dużego miasta', 'Big-city mayor'),
    description: L('Pragmatyk z samorządu. Dobry w spotkaniach z wyborcami i sprawach lokalnych.', 'Pragmatic local leader. Good at town halls and local issues.'),
    stats: { charisma: 68, debate: 62, experience: 55, integrity: 62, fundraising: 55, discipline: 60, campaign: 66, media: 62, grassroots: 65, scandalRisk: 40 },
    style: 'grassroots',
    fundsBonus: 0,
    flavor: L('Rządziłem miastem, w którym problemy nie czekają na ideologię — trzeba je po prostu rozwiązywać.', 'I ran a city where problems do not wait for ideology — you just have to solve them.'),
  },
};

export const PROFILE_LIST = Object.values(PROFILES);

export const STAT_LABEL: Record<keyof CandidateStats, LStr> = {
  charisma: L('Charyzma', 'Charisma'),
  debate: L('Debaty', 'Debating'),
  experience: L('Doświadczenie', 'Experience'),
  integrity: L('Wiarygodność', 'Credibility'),
  fundraising: L('Zbiórki', 'Fundraising'),
  discipline: L('Dyscyplina', 'Discipline'),
  campaign: L('Organizacja kampanii', 'Campaign skill'),
  media: L('Media i internet', 'Media skill'),
  grassroots: L('Poparcie oddolne', 'Grassroots'),
  scandalRisk: L('Podatność na skandale', 'Scandal risk'),
};

/** Stats the player sees exactly for their own candidate; rivals' stats are shown as rough ranges. */
export const VISIBLE_STATS: (keyof CandidateStats)[] = ['charisma', 'debate', 'experience', 'integrity', 'fundraising', 'campaign', 'media', 'grassroots'];

export const TRAIT_META: Record<TraitId, { label: LStr; icon: string; desc: LStr; good: boolean }> = {
  orator: { label: L('Porywający mówca', 'Gifted orator'), icon: '🎤', desc: L('Wiece mają większy efekt.', 'Rallies are more effective.'), good: true },
  debater: { label: L('Weteran debat', 'Debate veteran'), icon: '🧠', desc: L('Silny w debatach telewizyjnych.', 'Strong in televised debates.'), good: true },
  machine: { label: L('Maszyna kampanijna', 'Campaign machine'), icon: '⚙️', desc: L('Sprawna organizacja: skuteczniejsza agitacja od drzwi do drzwi i biura.', 'Strong organisation: more effective door-knocking and field offices.'), good: true },
  moneyMagnet: { label: L('Magnes na pieniądze', 'Money magnet'), icon: '💰', desc: L('Łatwo pozyskuje dużych darczyńców.', 'Easily attracts big donors.'), good: true },
  online: { label: L('Ulubieniec internetu', 'Internet darling'), icon: '📱', desc: L('Większa szansa na wiralowe sukcesy.', 'Higher chance of going viral.'), good: true },
  teflon: { label: L('Teflon', 'Teflon'), icon: '🛡️', desc: L('Skandale słabo się go imają.', 'Scandals barely stick.'), good: true },
  scandalProne: { label: L('Magnes na kontrowersje', 'Controversy magnet'), icon: '⚠️', desc: L('Skandale zdarzają się częściej i bolą bardziej.', 'Scandals happen more often and hurt more.'), good: false },
  grassroots: { label: L('Ruch oddolny', 'Grassroots movement'), icon: '✊', desc: L('Wolontariusze i drobni darczyńcy.', 'Volunteers and small donors.'), good: true },
  gaffeProne: { label: L('Skłonność do gaf', 'Gaffe-prone'), icon: '🙊', desc: L('Częstsze wpadki przy zmęczeniu.', 'More slip-ups when tired.'), good: false },
  veteran: { label: L('Waszyngtoński weteran', 'Washington veteran'), icon: '🏛️', desc: L('Doświadczenie budzi zaufanie, ale bywa obciążeniem.', 'Experience inspires trust, but can be baggage.'), good: true },
  outsider: { label: L('Outsider', 'Outsider'), icon: '🚪', desc: L('Świeża twarz — mniej doświadczenia, więcej szumu.', 'Fresh face — less experience, more buzz.'), good: true },
};

export function deriveTraits(s: CandidateStats): TraitId[] {
  const t: TraitId[] = [];
  if (s.charisma >= 75) t.push('orator');
  if (s.debate >= 70) t.push('debater');
  if (s.campaign >= 70) t.push('machine');
  if (s.fundraising >= 78) t.push('moneyMagnet');
  if (s.media >= 75) t.push('online');
  if (s.scandalRisk <= 28) t.push('teflon');
  if (s.scandalRisk >= 68) t.push('scandalProne');
  if (s.grassroots >= 75) t.push('grassroots');
  if (s.discipline <= 42) t.push('gaffeProne');
  if (s.experience >= 78) t.push('veteran');
  if (s.experience <= 30) t.push('outsider');
  return t.slice(0, 4);
}

export const AI_STYLE_LABEL: Record<AiStyle, LStr> = {
  aggressive: L('agresywny', 'aggressive'),
  establishment: L('establishmentowy', 'establishment'),
  grassroots: L('oddolny', 'grassroots'),
  media: L('medialny', 'media-driven'),
  balanced: L('zrównoważony', 'balanced'),
};
