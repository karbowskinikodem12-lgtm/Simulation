import type { CandidateStats, ProfileId } from '../engine/types';

export interface ProfileDef {
  id: ProfileId;
  label: string;
  description: string;
  stats: CandidateStats;
  fundsBonus: number; // $M added at start
  flavor: string; // used by the platform generator
}

export const PROFILES: Record<ProfileId, ProfileDef> = {
  governor: {
    id: 'governor',
    label: 'Gubernator',
    description: 'Doświadczony administrator stanowy. Zrównoważone statystyki, silny w stanie rodzinnym.',
    stats: { charisma: 60, debate: 60, experience: 75, integrity: 60, fundraising: 60, discipline: 65 },
    fundsBonus: 5,
    flavor: 'Jako gubernator udowodniłem, że potrafię rządzić skutecznie i ponad podziałami.',
  },
  senator: {
    id: 'senator',
    label: 'Senator',
    description: 'Weteran Waszyngtonu. Świetny w debatach i polityce zagranicznej, ale obciążony „bagażem” głosowań.',
    stats: { charisma: 55, debate: 72, experience: 80, integrity: 52, fundraising: 68, discipline: 62 },
    fundsBonus: 8,
    flavor: 'Przez lata w Senacie walczyłem o sprawy zwykłych Amerykanów.',
  },
  business: {
    id: 'business',
    label: 'Przedsiębiorca',
    description: 'Outsider z wielkiego biznesu. Ogromne fundusze, słabsze doświadczenie i dyscyplina.',
    stats: { charisma: 65, debate: 50, experience: 35, integrity: 45, fundraising: 85, discipline: 45 },
    fundsBonus: 25,
    flavor: 'Zbudowałem firmę od zera — teraz naprawię Amerykę tak, jak naprawiałem biznes.',
  },
  general: {
    id: 'general',
    label: 'Generał w stanie spoczynku',
    description: 'Bohater wojenny. Wysoka wiarygodność i dyscyplina, przewaga w bezpieczeństwie.',
    stats: { charisma: 55, debate: 50, experience: 60, integrity: 80, fundraising: 50, discipline: 80 },
    fundsBonus: 0,
    flavor: 'Służyłem temu krajowi w mundurze. Teraz chcę mu służyć jako głównodowodzący.',
  },
  activist: {
    id: 'activist',
    label: 'Aktywista',
    description: 'Lider ruchu społecznego. Porywa tłumy i entuzjazm, ale zbiera mniej pieniędzy.',
    stats: { charisma: 75, debate: 60, experience: 35, integrity: 72, fundraising: 45, discipline: 55 },
    fundsBonus: -3,
    flavor: 'Wyrosłem z ruchu oddolnego — to głos ludzi, nie lobbystów, zaprowadzi mnie do Białego Domu.',
  },
  celebrity: {
    id: 'celebrity',
    label: 'Celebryta',
    description: 'Gwiazda mediów. Charyzma i rozpoznawalność, ale łatwo o gafy i skandale.',
    stats: { charisma: 88, debate: 52, experience: 20, integrity: 48, fundraising: 70, discipline: 35 },
    fundsBonus: 10,
    flavor: 'Ameryka mnie zna. Wiem, jak rozmawiać z ludźmi, których elity ignorują.',
  },
  mayor: {
    id: 'mayor',
    label: 'Burmistrz dużego miasta',
    description: 'Pragmatyk z samorządu. Dobry w spotkaniach z wyborcami i sprawach lokalnych.',
    stats: { charisma: 68, debate: 62, experience: 55, integrity: 62, fundraising: 55, discipline: 60 },
    fundsBonus: 0,
    flavor: 'Rządziłem miastem, w którym problemy nie czekają na ideologię — trzeba je po prostu rozwiązywać.',
  },
};

export const PROFILE_LIST = Object.values(PROFILES);
