import type { AiStyle, CandidateStats, ProfileId, TraitId } from '../engine/types';

export interface ProfileDef {
  id: ProfileId;
  label: string;
  description: string;
  stats: CandidateStats;
  /** Default campaign behaviour of an AI candidate with this background. */
  style: AiStyle;
  fundsBonus: number; // $M added at start
  flavor: string; // used by the platform generator
}

export const PROFILES: Record<ProfileId, ProfileDef> = {
  governor: {
    id: 'governor',
    label: 'Gubernator',
    description: 'Doświadczony administrator stanowy. Zrównoważone statystyki, silny w stanie rodzinnym.',
    stats: { charisma: 60, debate: 60, experience: 75, integrity: 60, fundraising: 60, discipline: 65, campaign: 68, media: 55, grassroots: 55, scandalRisk: 40 },
    style: 'balanced',
    fundsBonus: 5,
    flavor: 'Jako gubernator udowodniłem, że potrafię rządzić skutecznie i ponad podziałami.',
  },
  senator: {
    id: 'senator',
    label: 'Senator',
    description: 'Weteran Waszyngtonu. Świetny w debatach i polityce zagranicznej, ale obciążony „bagażem” głosowań.',
    stats: { charisma: 55, debate: 72, experience: 80, integrity: 52, fundraising: 68, discipline: 62, campaign: 62, media: 52, grassroots: 45, scandalRisk: 50 },
    style: 'establishment',
    fundsBonus: 8,
    flavor: 'Przez lata w Senacie walczyłem o sprawy zwykłych Amerykanów.',
  },
  business: {
    id: 'business',
    label: 'Przedsiębiorca',
    description: 'Outsider z wielkiego biznesu. Ogromne fundusze, słabsze doświadczenie i dyscyplina.',
    stats: { charisma: 65, debate: 50, experience: 35, integrity: 45, fundraising: 85, discipline: 45, campaign: 60, media: 65, grassroots: 40, scandalRisk: 68 },
    style: 'aggressive',
    fundsBonus: 25,
    flavor: 'Zbudowałem firmę od zera — teraz naprawię Amerykę tak, jak naprawiałem biznes.',
  },
  general: {
    id: 'general',
    label: 'Generał w stanie spoczynku',
    description: 'Bohater wojenny. Wysoka wiarygodność i dyscyplina, przewaga w bezpieczeństwie.',
    stats: { charisma: 55, debate: 50, experience: 60, integrity: 80, fundraising: 50, discipline: 80, campaign: 70, media: 42, grassroots: 50, scandalRisk: 22 },
    style: 'establishment',
    fundsBonus: 0,
    flavor: 'Służyłem temu krajowi w mundurze. Teraz chcę mu służyć jako głównodowodzący.',
  },
  activist: {
    id: 'activist',
    label: 'Aktywista',
    description: 'Lider ruchu społecznego. Porywa tłumy i entuzjazm, ale zbiera mniej pieniędzy.',
    stats: { charisma: 75, debate: 60, experience: 35, integrity: 72, fundraising: 45, discipline: 55, campaign: 58, media: 70, grassroots: 85, scandalRisk: 35 },
    style: 'grassroots',
    fundsBonus: -3,
    flavor: 'Wyrosłem z ruchu oddolnego — to głos ludzi, nie lobbystów, zaprowadzi mnie do Białego Domu.',
  },
  celebrity: {
    id: 'celebrity',
    label: 'Celebryta',
    description: 'Gwiazda mediów. Charyzma i rozpoznawalność, ale łatwo o gafy i skandale.',
    stats: { charisma: 88, debate: 52, experience: 20, integrity: 48, fundraising: 70, discipline: 35, campaign: 45, media: 90, grassroots: 60, scandalRisk: 72 },
    style: 'media',
    fundsBonus: 10,
    flavor: 'Ameryka mnie zna. Wiem, jak rozmawiać z ludźmi, których elity ignorują.',
  },
  mayor: {
    id: 'mayor',
    label: 'Burmistrz dużego miasta',
    description: 'Pragmatyk z samorządu. Dobry w spotkaniach z wyborcami i sprawach lokalnych.',
    stats: { charisma: 68, debate: 62, experience: 55, integrity: 62, fundraising: 55, discipline: 60, campaign: 66, media: 62, grassroots: 65, scandalRisk: 40 },
    style: 'grassroots',
    fundsBonus: 0,
    flavor: 'Rządziłem miastem, w którym problemy nie czekają na ideologię — trzeba je po prostu rozwiązywać.',
  },
};

export const PROFILE_LIST = Object.values(PROFILES);

export const STAT_LABEL: Record<keyof CandidateStats, string> = {
  charisma: 'Charyzma',
  debate: 'Debaty',
  experience: 'Doświadczenie',
  integrity: 'Wiarygodność',
  fundraising: 'Zbiórki',
  discipline: 'Dyscyplina',
  campaign: 'Organizacja kampanii',
  media: 'Media i internet',
  grassroots: 'Poparcie oddolne',
  scandalRisk: 'Podatność na skandale',
};

/** Stats the player sees exactly for their own candidate; rivals' stats are shown as rough ranges. */
export const VISIBLE_STATS: (keyof CandidateStats)[] = ['charisma', 'debate', 'experience', 'integrity', 'fundraising', 'campaign', 'media', 'grassroots'];

export const TRAIT_META: Record<TraitId, { label: string; icon: string; desc: string; good: boolean }> = {
  orator: { label: 'Porywający mówca', icon: '🎤', desc: 'Wiece mają większy efekt.', good: true },
  debater: { label: 'Weteran debat', icon: '🧠', desc: 'Silny w debatach telewizyjnych.', good: true },
  machine: { label: 'Maszyna kampanijna', icon: '⚙️', desc: 'Sprawna organizacja: skuteczniejsze door-to-door i biura.', good: true },
  moneyMagnet: { label: 'Magnes na pieniądze', icon: '💰', desc: 'Łatwo pozyskuje dużych darczyńców.', good: true },
  online: { label: 'Ulubieniec internetu', icon: '📱', desc: 'Większa szansa na viralowe sukcesy.', good: true },
  teflon: { label: 'Teflon', icon: '🛡️', desc: 'Skandale słabo się go imają.', good: true },
  scandalProne: { label: 'Magnes na kontrowersje', icon: '⚠️', desc: 'Skandale zdarzają się częściej i bolą bardziej.', good: false },
  grassroots: { label: 'Ruch oddolny', icon: '✊', desc: 'Wolontariusze i drobni darczyńcy.', good: true },
  gaffeProne: { label: 'Skłonność do gaf', icon: '🙊', desc: 'Częstsze wpadki przy zmęczeniu.', good: false },
  veteran: { label: 'Waszyngtoński weteran', icon: '🏛️', desc: 'Doświadczenie budzi zaufanie, ale bywa obciążeniem.', good: true },
  outsider: { label: 'Outsider', icon: '🚪', desc: 'Świeża twarz — mniej doświadczenia, więcej szumu.', good: true },
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

export const AI_STYLE_LABEL: Record<AiStyle, string> = {
  aggressive: 'Agresywny',
  establishment: 'Establishmentowy',
  grassroots: 'Oddolny',
  media: 'Medialny',
  balanced: 'Zrównoważony',
};
