import type { Effect } from '../engine/effects';
import type { Candidate, GameState, IssueId, NewsTone } from '../engine/types';
import { DISASTER_COAST, RUST_BELT, BORDER } from './states';

export interface EventChoice {
  label: string;
  hint: string;
  effects: Effect[];
  news?: string;
  tone?: NewsTone;
  /** Relative likelihood an AI candidate picks this option. */
  aiWeight: number;
}

export type EventCategory = 'economy' | 'scandal' | 'crisis' | 'endorsement' | 'opportunity' | 'disaster' | 'world' | 'media';

export interface EventTemplate {
  id: string;
  category: EventCategory;
  icon: string;
  weight: number;
  minProgress?: number;
  maxProgress?: number;
  cooldown: number;
  once?: boolean;
  /**
   * candidate: targets one candidate (weighted by `targetWeight`);
   * world: affects everyone, then each candidate responds via `choices`.
   */
  target: 'candidate' | 'world';
  targetWeight?: (c: Candidate, g: GameState) => number;
  states?: readonly string[] | Set<string>;
  issue?: IssueId;
  condition?: (g: GameState) => boolean;
  title: string;
  text: string;
  tone?: NewsTone;
  effects?: Effect[];
  choices?: EventChoice[];
  impact?: number;
}

const lowIntegrity = (c: Candidate) => 1.6 - c.stats.integrity / 100;
const lowDiscipline = (c: Candidate) => 1.6 - c.stats.discipline / 100;

export const EVENT_TEMPLATES: EventTemplate[] = [
  // ---------------- scandals ----------------
  {
    id: 'old_posts',
    category: 'scandal',
    icon: '📱',
    weight: 1.1,
    cooldown: 25,
    target: 'candidate',
    targetWeight: lowDiscipline,
    title: 'Stare wpisy {self} wychodzą na jaw',
    text: 'Dziennikarze odkopali kontrowersyjne wpisy {self} sprzed dekady. Hashtag z nazwiskiem kandydata jest na szczycie trendów.',
    tone: 'bad',
    choices: [
      { label: 'Przeprosić publicznie', hint: 'Mała, pewna strata wizerunku. Temat szybko zgaśnie.', effects: [{ k: 'fav', t: 'self', v: -1.5 }, { k: 'momentum', t: 'self', v: -0.02 }], news: '{self} przeprasza za dawne wpisy: „To było dawno temu i dziś tak nie myślę”', aiWeight: 3 },
      {
        label: 'Zaprzeczyć i mówić o fałszywkach',
        hint: 'Ryzyko: 50% szans, że sprawa ucichnie, 50% że eksperci potwierdzą autentyczność.',
        effects: [{ k: 'chance', p: 0.5, yes: [{ k: 'enthusiasm', t: 'self', v: 2 }], no: [{ k: 'fav', t: 'self', v: -6 }, { k: 'momentum', t: 'self', v: -0.12 }, { k: 'key', text: 'Kłamstwo {self} w sprawie starych wpisów', impact: -6 }], yesNews: 'Afera wokół wpisów {self} wygasa', noNews: 'Eksperci: wpisy {self} są autentyczne. Sztab mijał się z prawdą' }],
        aiWeight: 1,
      },
      { label: 'Kontratak: „to atak mediów elit”', hint: 'Mobilizuje bazę (+entuzjazm), ale zraża niezdecydowanych.', effects: [{ k: 'enthusiasm', t: 'self', v: 4 }, { k: 'fav', t: 'self', v: -3 }], news: '{self} oskarża media o polowanie na czarownice', aiWeight: 2 },
    ],
    impact: -3,
  },
  {
    id: 'tax_returns',
    category: 'scandal',
    icon: '🧾',
    weight: 0.8,
    cooldown: 60,
    once: true,
    target: 'candidate',
    targetWeight: (c) => (c.profile === 'business' || c.profile === 'celebrity' ? 2.5 : 0.6),
    title: 'Pytania o zeznania podatkowe {self}',
    text: 'Media domagają się publikacji zeznań podatkowych {self}. Krążą plotki o rajach podatkowych i agresywnej optymalizacji.',
    tone: 'bad',
    choices: [
      { label: 'Opublikować zeznania', hint: 'Krótkotrwała krytyka, ale zyskujesz na wiarygodności.', effects: [{ k: 'fav', t: 'self', v: 1 }, { k: 'momentum', t: 'self', v: -0.03 }], news: '{self} publikuje zeznania podatkowe — bez większych niespodzianek', aiWeight: 2 },
      { label: 'Odmówić — „audyt w toku”', hint: 'Temat będzie wracał: -wizerunek, szansa na przeciek.', effects: [{ k: 'fav', t: 'self', v: -2 }, { k: 'chance', p: 0.35, yes: [{ k: 'fav', t: 'self', v: -5 }, { k: 'momentum', t: 'self', v: -0.1 }, { k: 'key', text: 'Przeciek zeznań podatkowych {self}', impact: -5 }], no: [], yesNews: 'PRZECIEK: zeznania {self} pokazują lata płacenia minimalnych podatków' }], aiWeight: 2 },
    ],
  },
  {
    id: 'finance_probe',
    category: 'scandal',
    icon: '🔍',
    weight: 0.6,
    minProgress: 0.2,
    cooldown: 50,
    target: 'candidate',
    targetWeight: lowIntegrity,
    title: 'Komisja wyborcza bada finanse kampanii {self}',
    text: 'Federalna Komisja Wyborcza wszczęła postępowanie w sprawie nieprawidłowości w raportach finansowych kampanii {self}.',
    tone: 'bad',
    choices: [
      { label: 'Zwolnić skarbnika kampanii', hint: 'Koszt: chaos w sztabie (-kondycja), ale ograniczasz straty.', effects: [{ k: 'fav', t: 'self', v: -1.5 }, { k: 'stamina', t: 'self', v: -15 }], news: 'Skarbnik kampanii {self} traci stanowisko', aiWeight: 2 },
      { label: 'Zapłacić karę i zamknąć sprawę', hint: '-$4 mln, temat znika.', effects: [{ k: 'funds', t: 'self', v: -4 }, { k: 'fav', t: 'self', v: -0.5 }], news: 'Kampania {self} płaci karę i zamyka śledztwo', aiWeight: 2 },
      { label: 'Walczyć w sądzie', hint: '60% szans na oczyszczenie (+wizerunek), 40% na kompromitację.', effects: [{ k: 'chance', p: 0.6, yes: [{ k: 'fav', t: 'self', v: 2 }], no: [{ k: 'fav', t: 'self', v: -5 }, { k: 'momentum', t: 'self', v: -0.08 }, { k: 'key', text: 'Przegrana {self} w sprawie finansów kampanii', impact: -5 }], yesNews: 'Sąd oczyszcza kampanię {self} z zarzutów', noNews: 'Sąd: kampania {self} złamała prawo wyborcze' }], aiWeight: 1 },
    ],
  },
  {
    id: 'hot_mic',
    category: 'media',
    icon: '🎤',
    weight: 1,
    cooldown: 20,
    target: 'candidate',
    targetWeight: lowDiscipline,
    title: 'Nagranie z „gorącego mikrofonu”: {self}',
    text: 'Po zakończeniu wywiadu mikrofon {self} wciąż był włączony. Padły ostre, lekceważące słowa o wyborcach z {state}.',
    tone: 'bad',
    states: ['PA', 'MI', 'WI', 'OH', 'GA', 'AZ', 'NC', 'NV', 'IA', 'FL', 'TX'],
    choices: [
      { label: 'Natychmiast przeprosić i pojechać do {state}', hint: '-wizerunek, ale odbudowujesz pozycję lokalnie.', effects: [{ k: 'fav', t: 'self', v: -2 }, { k: 'local', t: 'self', v: 0.02 }, { k: 'stamina', t: 'self', v: -10 }], news: '{self} jedzie do {state}, by przeprosić mieszkańców', aiWeight: 3 },
      { label: 'Obrócić to w żart', hint: '50/50: może rozbroić sytuację albo pogrążyć.', effects: [{ k: 'chance', p: 0.5, yes: [{ k: 'momentum', t: 'self', v: 0.04 }], no: [{ k: 'fav', t: 'self', v: -4 }, { k: 'local', t: 'self', v: -0.06 }], yesNews: 'Internet kocha dystans {self} do własnej wpadki', noNews: 'Żart {self} pogłębia oburzenie w {state}' }], aiWeight: 1 },
    ],
    impact: -2,
  },
  {
    id: 'health_scare',
    category: 'media',
    icon: '🩺',
    weight: 0.45,
    cooldown: 60,
    once: true,
    target: 'candidate',
    targetWeight: (c) => 1 + (100 - c.stamina) / 60,
    title: '{self} słabnie na scenie podczas wystąpienia',
    text: 'Na nagraniu widać, jak {self} chwieje się na scenie. Sztab mówi o odwodnieniu, ale media spekulują o stanie zdrowia.',
    tone: 'bad',
    choices: [
      { label: 'Opublikować pełną dokumentację medyczną', hint: 'Uspokaja wyborców, kosztuje dwa dni przerwy.', effects: [{ k: 'fav', t: 'self', v: 1 }, { k: 'stamina', t: 'self', v: 20 }, { k: 'momentum', t: 'self', v: -0.03 }], news: 'Lekarze: {self} jest w dobrym zdrowiu', aiWeight: 3 },
      { label: 'Wrócić od razu na szlak kampanii', hint: 'Pokaz siły — ale przy niskiej kondycji ryzyko powtórki.', effects: [{ k: 'stamina', t: 'self', v: -15 }, { k: 'chance', p: 0.3, yes: [{ k: 'fav', t: 'self', v: -6 }, { k: 'key', text: 'Kolejne zasłabnięcie: {self}', impact: -6 }], no: [{ k: 'momentum', t: 'self', v: 0.04 }], yesNews: '{self} ponownie słabnie na scenie. Pytania o zdolność do sprawowania urzędu', noNews: '{self} wraca na trasę w świetnej formie' }], aiWeight: 1 },
    ],
  },
  {
    id: 'october_surprise',
    category: 'scandal',
    icon: '💣',
    weight: 2.2,
    minProgress: 0.82,
    maxProgress: 0.97,
    cooldown: 999,
    once: true,
    target: 'candidate',
    targetWeight: (c, g) => {
      const lead = g.history[g.history.length - 1]?.winProb[c.id] ?? 0.5;
      return 0.3 + lead * 2;
    },
    title: 'OCTOBER SURPRISE: kompromitujące dokumenty o {self}',
    text: 'Na kilka dni przed wyborami wielki dziennik publikuje dokumenty sugerujące ukrywanie konfliktu interesów przez {self}. To może zmienić wynik.',
    tone: 'breaking',
    choices: [
      { label: 'Pełna transparentność — konferencja prasowa', hint: 'Ograniczasz straty: średni spadek wizerunku.', effects: [{ k: 'fav', t: 'self', v: -3 }, { k: 'momentum', t: 'self', v: -0.08 }], news: '{self}: „Nie mam nic do ukrycia” — wielogodzinna konferencja', aiWeight: 2 },
      { label: 'Atak na wiarygodność gazety', hint: 'Baza się mobilizuje, ale umiarkowani odchodzą.', effects: [{ k: 'fav', t: 'self', v: -5 }, { k: 'enthusiasm', t: 'self', v: 5 }, { k: 'momentum', t: 'self', v: -0.06 }], news: '{self} nazywa publikację „spiskiem establishmentu”', aiWeight: 2 },
      { label: 'Przeczekać i milczeć', hint: 'Ryzykowne: przeciwnicy narzucą narrację.', effects: [{ k: 'chance', p: 0.4, yes: [{ k: 'fav', t: 'self', v: -1.5 }], no: [{ k: 'fav', t: 'self', v: -7 }, { k: 'momentum', t: 'self', v: -0.15 }], yesNews: 'Sprawa {self} gubi się w natłoku wiadomości', noNews: 'Milczenie {self} tylko podsyca aferę' }], aiWeight: 1 },
    ],
    impact: -6,
  },
  // ---------------- opportunities ----------------
  {
    id: 'union_endorsement',
    category: 'endorsement',
    icon: '🤝',
    weight: 0.9,
    cooldown: 40,
    once: true,
    target: 'candidate',
    targetWeight: (c) => (c.positions.jobs < 20 ? 2 : 0.4),
    title: 'Wielki związek zawodowy rozważa poparcie {self}',
    text: 'Federacja związków przemysłowych z Pasa Rdzy jest gotowa poprzeć {self} — w zamian za twarde zobowiązania w sprawie ochrony miejsc pracy.',
    tone: 'good',
    choices: [
      { label: 'Przyjąć warunki związkowców', hint: 'Duży zysk w Pasie Rdzy (MI, PA, WI, OH), stanowisko w sprawie pracy przesuwa się w lewo.', effects: [{ k: 'position', t: 'self', issue: 'jobs', v: -15 }, { k: 'local', t: 'self', v: 0.06, states: [...RUST_BELT] }, { k: 'enthusiasm', t: 'self', v: 2 }, { k: 'key', text: 'Związki zawodowe popierają {self}', impact: 3 }], news: 'Związkowcy z Pasa Rdzy popierają {self}', tone: 'good', aiWeight: 3 },
      { label: 'Odmówić', hint: 'Zachowujesz swój program. Bez zmian.', effects: [{ k: 'local', t: 'self', v: -0.01, states: [...RUST_BELT] }], news: '{self} odrzuca warunki związków zawodowych', aiWeight: 1 },
    ],
  },
  {
    id: 'super_pac',
    category: 'opportunity',
    icon: '🏦',
    weight: 1,
    cooldown: 30,
    target: 'candidate',
    title: 'Super PAC oferuje wsparcie dla {self}',
    text: 'Grupa miliarderów chce przeznaczyć 15 milionów dolarów na reklamy wspierające {self}. Nieoficjalnie oczekują przychylności dla swojej branży.',
    choices: [
      { label: 'Przyjąć pieniądze', hint: '+$15 mln, lekki spadek wizerunku.', effects: [{ k: 'funds', t: 'self', v: 15 }, { k: 'fav', t: 'self', v: -1.5 }], news: 'Super PAC wspiera {self} kwotą 15 mln dolarów', aiWeight: 3 },
      { label: 'Odmówić — „nie jestem na sprzedaż”', hint: 'Poprawa wizerunku i entuzjazmu.', effects: [{ k: 'fav', t: 'self', v: 1.5 }, { k: 'enthusiasm', t: 'self', v: 2 }], news: '{self} odrzuca miliony od miliarderów', tone: 'good', aiWeight: 1 },
    ],
  },
  {
    id: 'viral_moment',
    category: 'media',
    icon: '🔥',
    weight: 1,
    cooldown: 15,
    target: 'candidate',
    targetWeight: (c) => c.stats.charisma / 50,
    title: '{self} bije rekordy popularności w sieci',
    text: 'Spontaniczna rozmowa {self} z kelnerką z Ohio ma ponad 40 mln wyświetleń. Młodzi wyborcy szaleją.',
    tone: 'good',
    effects: [{ k: 'momentum', t: 'self', v: 0.08 }, { k: 'enthusiasm', t: 'self', v: 3 }, { k: 'fav', t: 'self', v: 1 }],
    impact: 2,
  },
  {
    id: 'celebrity_endorsement',
    category: 'endorsement',
    icon: '⭐',
    weight: 0.9,
    cooldown: 20,
    target: 'candidate',
    title: 'Gwiazda muzyki popiera {self}',
    text: 'Jedna z najpopularniejszych artystek w kraju zaapelowała do swoich 200 mln obserwujących o głosowanie na {self}.',
    tone: 'good',
    effects: [{ k: 'enthusiasm', t: 'self', v: 4 }, { k: 'momentum', t: 'self', v: 0.04 }],
    impact: 2,
  },
  {
    id: 'governor_endorsement',
    category: 'endorsement',
    icon: '🏛️',
    weight: 0.9,
    cooldown: 20,
    target: 'candidate',
    states: ['PA', 'MI', 'WI', 'GA', 'AZ', 'NC', 'NV', 'NH', 'MN', 'VA', 'OH', 'FL'],
    title: 'Popularny gubernator {state} popiera {self}',
    text: 'Gubernator {state}, ciesząca się 60% poparcia, ogłosiła, że zagłosuje na {self} i ruszy z kandydatem w trasę po stanie.',
    tone: 'good',
    effects: [{ k: 'local', t: 'self', v: 0.07 }, { k: 'momentum', t: 'self', v: 0.02 }],
    impact: 2,
  },
  {
    id: 'leaked_memo',
    category: 'opportunity',
    icon: '📂',
    weight: 0.8,
    minProgress: 0.15,
    cooldown: 40,
    target: 'candidate',
    title: 'Wyciek strategii kampanii {other}',
    text: 'Sztab {self} otrzymał anonimowo wewnętrzną notatkę kampanii {other}, z cynicznymi komentarzami o wyborcach.',
    choices: [
      { label: 'Ujawnić notatkę mediom', hint: 'Mocno uderza w rywala, ale 30% ryzyka, że afera obróci się przeciwko Tobie.', effects: [{ k: 'chance', p: 0.7, yes: [{ k: 'fav', t: 'other', v: -4 }, { k: 'momentum', t: 'other', v: -0.08 }, { k: 'key', text: 'Wyciek notatki kampanii {other}', impact: -4, t: 'other' }], no: [{ k: 'fav', t: 'self', v: -4 }, { k: 'momentum', t: 'self', v: -0.06 }], yesNews: 'Notatka sztabu {other} wywołuje burzę', noNews: 'Afera: sztab {self} wykorzystał skradzione dokumenty' }], aiWeight: 2 },
      { label: 'Zwrócić dokumenty i nie wykorzystywać', hint: 'Zyskujesz wizerunek uczciwego polityka.', effects: [{ k: 'fav', t: 'self', v: 2 }], news: '{self} odmawia wykorzystania wykradzionych dokumentów rywala', tone: 'good', aiWeight: 1 },
    ],
  },
  {
    id: 'disinfo',
    category: 'media',
    icon: '🤖',
    weight: 0.7,
    minProgress: 0.3,
    cooldown: 35,
    target: 'candidate',
    title: 'Kampania dezinformacji wymierzona w {self}',
    text: 'Zagraniczne farmy trolli rozpowszechniają spreparowane nagranie deepfake z {self}. Platformy reagują powoli.',
    tone: 'bad',
    choices: [
      { label: 'Ostro zareagować i zgłosić sprawę FBI', hint: 'Ograniczasz szkody, temat bezpieczeństwa zyskuje na znaczeniu.', effects: [{ k: 'fav', t: 'self', v: -0.5 }, { k: 'salience', issue: 'foreign', v: 0.15 }], news: '{self} alarmuje: obce państwo ingeruje w wybory', aiWeight: 2 },
      { label: 'Zignorować', hint: '50% szans, że fałszywka sama zniknie.', effects: [{ k: 'chance', p: 0.5, yes: [], no: [{ k: 'fav', t: 'self', v: -3.5 }], noNews: 'Deepfake z {self} obejrzało już 30 mln osób' }], aiWeight: 1 },
    ],
  },
  // ---------------- world events ----------------
  {
    id: 'hurricane',
    category: 'disaster',
    icon: '🌀',
    weight: 0.8,
    cooldown: 25,
    target: 'world',
    states: DISASTER_COAST,
    issue: 'climate',
    title: 'Huragan uderza w {state}',
    text: 'Huragan kategorii 4 spustoszył wybrzeże {state}. Setki tysięcy ludzi bez prądu. Kampanie muszą zdecydować, jak zareagować.',
    tone: 'breaking',
    effects: [{ k: 'salience', issue: 'climate', v: 0.25 }, { k: 'econ', field: 'gdp', v: -0.2 }],
    choices: [
      { label: 'Odwiedzić poszkodowanych', hint: 'Zysk w {state}, ale ryzyko oskarżeń o „sesję zdjęciową”.', effects: [{ k: 'stamina', t: 'self', v: -10 }, { k: 'chance', p: 0.75, yes: [{ k: 'local', t: 'self', v: 0.05 }, { k: 'fav', t: 'self', v: 1 }], no: [{ k: 'local', t: 'self', v: -0.03 }], yesNews: '{self} pomaga przy rozładunku darów w {state}', noNews: 'Krytyka: wizyta {self} utrudniła akcję ratunkową' }], aiWeight: 2 },
      { label: 'Zorganizować zbiórkę pomocy', hint: '-$2 mln, solidny zysk wizerunkowy.', effects: [{ k: 'funds', t: 'self', v: -2 }, { k: 'fav', t: 'self', v: 1.5 }, { k: 'local', t: 'self', v: 0.03 }], news: 'Kampania {self} przekazuje miliony dla ofiar huraganu', tone: 'good', aiWeight: 2 },
      { label: 'Kontynuować kampanię', hint: 'Bez kosztów, ale lekka strata lokalnie.', effects: [{ k: 'local', t: 'self', v: -0.02 }], aiWeight: 1 },
    ],
    impact: 0,
  },
  {
    id: 'intl_crisis',
    category: 'world',
    icon: '🌐',
    weight: 0.8,
    cooldown: 30,
    target: 'world',
    issue: 'foreign',
    title: 'Kryzys międzynarodowy: napięcie na Morzu Południowochińskim',
    text: 'Okręty dwóch mocarstw o mały włos nie zderzyły się w cieśninie. Rynki nerwowo reagują, a wyborcy pytają, kto lepiej poradzi sobie jako głównodowodzący.',
    tone: 'breaking',
    effects: [{ k: 'salience', issue: 'foreign', v: 0.45 }, { k: 'econ', field: 'gas', v: 0.15 }],
    choices: [
      { label: 'Twarda postawa: „Ameryka się nie ugnie”', hint: 'Zyskujesz, jeśli masz doświadczenie lub konserwatywny profil.', effects: [{ k: 'position', t: 'self', issue: 'foreign', v: 8 }, { k: 'momentum', t: 'self', v: 0.02 }], aiWeight: 2 },
      { label: 'Wezwanie do dyplomacji i sojuszników', hint: 'Bezpieczne, uspokaja umiarkowanych.', effects: [{ k: 'position', t: 'self', issue: 'foreign', v: -6 }, { k: 'fav', t: 'self', v: 1 }], aiWeight: 2 },
      { label: 'Wstrzymać się od komentarzy', hint: 'Unikasz ryzyka, ale wyglądasz na niezdecydowanego.', effects: [{ k: 'momentum', t: 'self', v: -0.02 }], aiWeight: 1 },
    ],
  },
  {
    id: 'border_surge',
    category: 'crisis',
    icon: '🛂',
    weight: 0.8,
    cooldown: 30,
    target: 'world',
    states: BORDER,
    issue: 'immigration',
    title: 'Rekordowa liczba przekroczeń granicy w {state}',
    text: 'Służby graniczne raportują rekordową liczbę zatrzymań. Władze {state} ogłaszają stan wyjątkowy.',
    tone: 'breaking',
    effects: [{ k: 'salience', issue: 'immigration', v: 0.45 }],
    choices: [
      { label: 'Pojechać na granicę', hint: 'Silny sygnał — opłaca się, jeśli Twoje stanowisko jest bliskie wyborcom.', effects: [{ k: 'stamina', t: 'self', v: -10 }, { k: 'local', t: 'self', v: 0.03 }, { k: 'salience', issue: 'immigration', v: 0.1 }], aiWeight: 2 },
      { label: 'Przedstawić plan reformy imigracyjnej', hint: 'Lekko przesuwa Cię do centrum w sprawie imigracji, +wizerunek.', effects: [{ k: 'moderate', t: 'self', issue: 'immigration', v: 0.3 }, { k: 'fav', t: 'self', v: 1 }], aiWeight: 2 },
      { label: 'Zmienić temat', hint: 'Zmniejsza znaczenie tematu, ale -momentum.', effects: [{ k: 'salience', issue: 'immigration', v: -0.15 }, { k: 'momentum', t: 'self', v: -0.02 }], aiWeight: 1 },
    ],
  },
  {
    id: 'market_crash',
    category: 'economy',
    icon: '📉',
    weight: 0.5,
    cooldown: 50,
    target: 'world',
    title: 'Krach na Wall Street: S&P 500 traci 7% w jeden dzień',
    text: 'Panika na giełdach po bankructwie dużego funduszu. Ekonomiści ostrzegają przed recesją. Wyborcy patrzą na partię rządzącą.',
    tone: 'breaking',
    effects: [{ k: 'econ', field: 'gdp', v: -1.1 }, { k: 'econ', field: 'unemployment', v: 0.3 }, { k: 'salience', issue: 'economy', v: 0.5 }],
    impact: 0,
  },
  {
    id: 'gas_drop',
    category: 'economy',
    icon: '⛽',
    weight: 0.5,
    cooldown: 40,
    target: 'world',
    title: 'Ceny benzyny spadają najszybciej od lat',
    text: 'OPEC zwiększa wydobycie, a średnia cena paliwa spada. Kierowcy oddychają z ulgą.',
    tone: 'good',
    effects: [{ k: 'econ', field: 'gas', v: -0.4 }, { k: 'econ', field: 'inflation', v: -0.3 }, { k: 'salience', issue: 'inflation', v: -0.15 }],
  },
  {
    id: 'scotus',
    category: 'world',
    icon: '⚖️',
    weight: 0.6,
    cooldown: 45,
    once: true,
    target: 'world',
    issue: 'social',
    title: 'Przełomowy wyrok Sądu Najwyższego',
    text: 'Sąd Najwyższy wydał kontrowersyjne orzeczenie w sprawie światopoglądowej. Protesty przed budynkiem sądu, a temat dominuje w mediach.',
    tone: 'breaking',
    effects: [{ k: 'salience', issue: 'social', v: 0.55 }],
    choices: [
      { label: 'Zdecydowanie skomentować wyrok', hint: 'Mobilizuje Twoją bazę (+entuzjazm).', effects: [{ k: 'enthusiasm', t: 'self', v: 4 }, { k: 'fav', t: 'self', v: -0.5 }], aiWeight: 2 },
      { label: 'Wezwać do spokoju i kompromisu', hint: 'Zyskujesz u umiarkowanych.', effects: [{ k: 'fav', t: 'self', v: 1.2 }, { k: 'enthusiasm', t: 'self', v: -1 }], aiWeight: 1 },
    ],
  },
  {
    id: 'crime_wave',
    category: 'crisis',
    icon: '🚨',
    weight: 0.6,
    cooldown: 30,
    target: 'world',
    states: ['IL', 'NY', 'CA', 'PA', 'GA', 'MI', 'MO', 'TX', 'MN'],
    issue: 'security',
    title: 'Fala przestępczości w {state}',
    text: 'Seria brutalnych napadów w największym mieście {state} wstrząsnęła opinią publiczną. Bezpieczeństwo wraca na czołówki.',
    tone: 'bad',
    effects: [{ k: 'salience', issue: 'security', v: 0.4 }],
  },
  {
    id: 'strike',
    category: 'economy',
    icon: '🏭',
    weight: 0.5,
    cooldown: 40,
    target: 'world',
    states: [...RUST_BELT],
    issue: 'jobs',
    title: 'Strajk w fabrykach samochodów w {state}',
    text: '45 tysięcy pracowników przemysłu motoryzacyjnego w {state} odchodzi od taśm. Kandydaci są pytani, po czyjej stronie stoją.',
    tone: 'neutral',
    effects: [{ k: 'salience', issue: 'jobs', v: 0.35 }, { k: 'econ', field: 'gdp', v: -0.15 }],
    choices: [
      { label: 'Stanąć na pikiecie z robotnikami', hint: 'Zysk w {state} i regionie; przesunięcie w lewo w sprawie pracy.', effects: [{ k: 'local', t: 'self', v: 0.04, region: true }, { k: 'position', t: 'self', issue: 'jobs', v: -8 }], aiWeight: 2 },
      { label: 'Wezwać obie strony do porozumienia', hint: 'Neutralnie, lekki plus wizerunkowy.', effects: [{ k: 'fav', t: 'self', v: 0.6 }], aiWeight: 2 },
      { label: 'Poprzeć zarządy firm', hint: 'Przesunięcie w prawo, strata w {state}.', effects: [{ k: 'local', t: 'self', v: -0.04 }, { k: 'position', t: 'self', issue: 'jobs', v: 8 }], aiWeight: 1 },
    ],
  },
  {
    id: 'wildfires',
    category: 'disaster',
    icon: '🔥',
    weight: 0.5,
    cooldown: 40,
    target: 'world',
    states: ['CA', 'OR', 'WA', 'CO', 'AZ', 'NV', 'MT'],
    issue: 'climate',
    title: 'Ogromne pożary lasów w {state}',
    text: 'Pożary strawiły setki tysięcy akrów w {state}. Dym dociera aż do wschodniego wybrzeża. Debata o klimacie wraca z całą siłą.',
    tone: 'breaking',
    effects: [{ k: 'salience', issue: 'climate', v: 0.4 }],
  },
  {
    id: 'drug_prices',
    category: 'world',
    icon: '💊',
    weight: 0.5,
    cooldown: 40,
    target: 'world',
    issue: 'healthcare',
    title: 'Koncern farmaceutyczny podnosi cenę insuliny o 300%',
    text: 'Oburzenie po decyzji koncernu. Historia chorej nastolatki, której rodziny nie stać na leki, obiegła wszystkie media.',
    tone: 'bad',
    effects: [{ k: 'salience', issue: 'healthcare', v: 0.4 }],
  },
];
