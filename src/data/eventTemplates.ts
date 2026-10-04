import type { Effect } from '../engine/effects';
import type { Candidate, GameState, IssueId, NewsTone, Severity } from '../engine/types';
import { DISASTER_COAST, RUST_BELT, BORDER } from './states';
import { L, type LStr } from '../i18n';

export interface EventChoice {
  label: LStr;
  hint: LStr;
  effects: Effect[];
  news?: LStr;
  tone?: NewsTone;
  /** Relative likelihood an AI candidate picks this option. */
  aiWeight: number;
}

export type EventCategory = 'economy' | 'scandal' | 'crisis' | 'endorsement' | 'opportunity' | 'disaster' | 'world' | 'media' | 'social' | 'campaign';

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
  title: LStr;
  text: LStr;
  tone?: NewsTone;
  effects?: Effect[];
  choices?: EventChoice[];
  impact?: number;
  /** News weight: most events are minor, a few are game changers. Defaults to 'moderate'. */
  tier?: Severity;
  /** Fired by the campaign calendar, never by the random roll. */
  scheduled?: boolean;
  /** Pick ctx.state for a given candidate (e.g. the best swing state for a running mate). */
  stateFor?: (g: GameState, candId: string) => string;
}

const scandalProne = (c: Candidate) => 0.4 + c.stats.scandalRisk / 60;
const lowIntegrity = (c: Candidate) => (1.6 - c.stats.integrity / 100) * scandalProne(c);
const lowDiscipline = (c: Candidate) => (1.6 - c.stats.discipline / 100) * scandalProne(c);
const SWING = ['PA', 'MI', 'WI', 'GA', 'AZ', 'NC', 'NV'];

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
    title: L('Stare wpisy {self} wychodzą na jaw', 'Old posts by {self} resurface'),
    text: L('Dziennikarze odkopali kontrowersyjne wpisy {self} sprzed dekady. Hashtag z nazwiskiem kandydata jest na szczycie trendów.', 'Journalists dug up controversial posts {self} wrote a decade ago. The candidate\'s name is trending.'),
    tone: 'bad',
    choices: [
      { label: L('Przeprosić publicznie', 'Apologize publicly'), hint: L('Mała, pewna strata wizerunku. Temat szybko zgaśnie.', 'Small, certain hit to your image. The story fades quickly.'), effects: [{ k: 'fav', t: 'self', v: -1.5 }, { k: 'momentum', t: 'self', v: -0.02 }], news: L('{self} przeprasza za dawne wpisy: „To było dawno temu i dziś tak nie myślę”', '{self} apologizes for old posts: “That was long ago and I no longer think that way”'), aiWeight: 3 },
      {
        label: L('Zaprzeczyć i mówić o fałszywkach', 'Deny and call them fakes'),
        hint: L('Ryzyko: 50% szans, że sprawa ucichnie, 50% że eksperci potwierdzą autentyczność.', 'Risky: 50% chance the story dies, 50% chance experts confirm they are real.'),
        effects: [{ k: 'chance', p: 0.5, yes: [{ k: 'enthusiasm', t: 'self', v: 2 }], no: [{ k: 'fav', t: 'self', v: -6 }, { k: 'momentum', t: 'self', v: -0.12 }, { k: 'key', text: L('Kłamstwo {self} w sprawie starych wpisów', '{self} lied about old posts'), impact: -6 }], yesNews: L('Afera wokół wpisów {self} wygasa', 'The {self} posts story fizzles out'), noNews: L('Eksperci: wpisy {self} są autentyczne. Sztab mijał się z prawdą', 'Experts: {self}\'s posts are authentic. The campaign was not telling the truth') }],
        aiWeight: 1,
      },
      { label: L('Kontratak: „to atak mediów elit”', 'Hit back: “an attack by the elite media”'), hint: L('Mobilizuje bazę (+entuzjazm), ale zraża niezdecydowanych.', 'Fires up the base (+enthusiasm), but alienates undecided voters.'), effects: [{ k: 'enthusiasm', t: 'self', v: 4 }, { k: 'fav', t: 'self', v: -3 }], news: L('{self} oskarża media o polowanie na czarownice', '{self} accuses the media of a witch hunt'), aiWeight: 2 },
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
    targetWeight: (c) => (c.profile === 'business' || c.profile === 'celebrity' ? 2.5 : 0.6) * scandalProne(c),
    title: L('Pytania o zeznania podatkowe {self}', 'Questions about {self}\'s tax returns'),
    text: L('Media domagają się publikacji zeznań podatkowych {self}. Krążą plotki o rajach podatkowych i agresywnej optymalizacji.', 'The press demands that {self} release tax returns. Rumors swirl about tax havens and aggressive tax avoidance.'),
    tone: 'bad',
    choices: [
      { label: L('Opublikować zeznania', 'Release the returns'), hint: L('Krótkotrwała krytyka, ale zyskujesz na wiarygodności.', 'Brief criticism, but you gain credibility.'), effects: [{ k: 'fav', t: 'self', v: 1 }, { k: 'momentum', t: 'self', v: -0.03 }], news: L('{self} publikuje zeznania podatkowe — bez większych niespodzianek', '{self} releases tax returns — no big surprises'), aiWeight: 2 },
      { label: L('Odmówić — „audyt w toku”', 'Refuse — “under audit”'), hint: L('Temat będzie wracał: -wizerunek, szansa na przeciek.', 'The story keeps coming back: -image, chance of a leak.'), effects: [{ k: 'fav', t: 'self', v: -2 }, { k: 'chance', p: 0.35, yes: [{ k: 'fav', t: 'self', v: -5 }, { k: 'momentum', t: 'self', v: -0.1 }, { k: 'key', text: L('Przeciek zeznań podatkowych {self}', '{self}\'s tax returns leaked'), impact: -5 }], no: [], yesNews: L('PRZECIEK: zeznania {self} pokazują lata płacenia minimalnych podatków', 'LEAK: {self}\'s returns show years of paying minimal taxes') }], aiWeight: 2 },
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
    title: L('Komisja wyborcza bada finanse kampanii {self}', 'Election regulators probe {self}\'s campaign finances'),
    text: L('Federalna Komisja Wyborcza wszczęła postępowanie w sprawie nieprawidłowości w raportach finansowych kampanii {self}.', 'The Federal Election Commission opened a probe into irregularities in {self}\'s campaign finance reports.'),
    tone: 'bad',
    choices: [
      { label: L('Zwolnić skarbnika kampanii', 'Fire the campaign treasurer'), hint: L('Koszt: chaos w sztabie (-kondycja), ale ograniczasz straty.', 'Cost: turmoil in the campaign (-stamina), but you limit the damage.'), effects: [{ k: 'fav', t: 'self', v: -1.5 }, { k: 'stamina', t: 'self', v: -15 }], news: L('Skarbnik kampanii {self} traci stanowisko', '{self}\'s campaign treasurer is out'), aiWeight: 2 },
      { label: L('Zapłacić karę i zamknąć sprawę', 'Pay the fine and close the case'), hint: L('-$4 mln, temat znika.', '-$4M, the story goes away.'), effects: [{ k: 'funds', t: 'self', v: -4 }, { k: 'fav', t: 'self', v: -0.5 }], news: L('Kampania {self} płaci karę i zamyka śledztwo', '{self}\'s campaign pays a fine and closes the probe'), aiWeight: 2 },
      { label: L('Walczyć w sądzie', 'Fight it in court'), hint: L('60% szans na oczyszczenie (+wizerunek), 40% na kompromitację.', '60% chance of being cleared (+image), 40% chance of embarrassment.'), effects: [{ k: 'chance', p: 0.6, yes: [{ k: 'fav', t: 'self', v: 2 }], no: [{ k: 'fav', t: 'self', v: -5 }, { k: 'momentum', t: 'self', v: -0.08 }, { k: 'key', text: L('Przegrana {self} w sprawie finansów kampanii', '{self} loses campaign finance case'), impact: -5 }], yesNews: L('Sąd oczyszcza kampanię {self} z zarzutów', 'Court clears {self}\'s campaign'), noNews: L('Sąd: kampania {self} złamała prawo wyborcze', 'Court: {self}\'s campaign broke election law') }], aiWeight: 1 },
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
    title: L('Nagranie z „gorącego mikrofonu”: {self}', 'Hot mic recording: {self}'),
    text: L('Po zakończeniu wywiadu mikrofon {self} wciąż był włączony. Padły ostre, lekceważące słowa o wyborcach z {state}.', 'After an interview, {self}\'s microphone was still on. Harsh, dismissive words about voters in {state} were caught on tape.'),
    tone: 'bad',
    states: ['PA', 'MI', 'WI', 'OH', 'GA', 'AZ', 'NC', 'NV', 'IA', 'FL', 'TX'],
    choices: [
      { label: L('Natychmiast przeprosić i pojechać do {state}', 'Apologize at once and travel to {state}'), hint: L('-wizerunek, ale odbudowujesz pozycję lokalnie.', '-image, but you rebuild your local standing.'), effects: [{ k: 'fav', t: 'self', v: -2 }, { k: 'local', t: 'self', v: 0.02 }, { k: 'stamina', t: 'self', v: -10 }], news: L('{self} jedzie do {state}, by przeprosić mieszkańców', '{self} travels to {state} to apologize to residents'), aiWeight: 3 },
      { label: L('Obrócić to w żart', 'Laugh it off'), hint: L('50/50: może rozbroić sytuację albo pogrążyć.', '50/50: it may defuse the situation or make it worse.'), effects: [{ k: 'chance', p: 0.5, yes: [{ k: 'momentum', t: 'self', v: 0.04 }], no: [{ k: 'fav', t: 'self', v: -4 }, { k: 'local', t: 'self', v: -0.06 }], yesNews: L('Internet kocha dystans {self} do własnej wpadki', 'The internet loves how {self} laughs at their own gaffe'), noNews: L('Żart {self} pogłębia oburzenie w {state}', '{self}\'s joke deepens the outrage in {state}') }], aiWeight: 1 },
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
    title: L('{self} słabnie na scenie podczas wystąpienia', '{self} falters on stage during a speech'),
    text: L('Na nagraniu widać, jak {self} chwieje się na scenie. Sztab mówi o odwodnieniu, ale media spekulują o stanie zdrowia.', 'Video shows {self} swaying on stage. The campaign blames dehydration, but the media speculate about health.'),
    tone: 'bad',
    choices: [
      { label: L('Opublikować pełną dokumentację medyczną', 'Release full medical records'), hint: L('Uspokaja wyborców, kosztuje dwa dni przerwy.', 'Reassures voters, costs two days off the trail.'), effects: [{ k: 'fav', t: 'self', v: 1 }, { k: 'stamina', t: 'self', v: 20 }, { k: 'momentum', t: 'self', v: -0.03 }], news: L('Lekarze: {self} jest w dobrym zdrowiu', 'Doctors: {self} is in good health'), aiWeight: 3 },
      { label: L('Wrócić od razu na szlak kampanii', 'Return to the trail immediately'), hint: L('Pokaz siły — ale przy niskiej kondycji ryzyko powtórki.', 'A show of strength — but with low stamina it may happen again.'), effects: [{ k: 'stamina', t: 'self', v: -15 }, { k: 'chance', p: 0.3, yes: [{ k: 'fav', t: 'self', v: -6 }, { k: 'key', text: L('Kolejne zasłabnięcie: {self}', 'Another collapse: {self}'), impact: -6 }], no: [{ k: 'momentum', t: 'self', v: 0.04 }], yesNews: L('{self} ponownie słabnie na scenie. Pytania o zdolność do sprawowania urzędu', '{self} falters on stage again. Questions about fitness for office'), noNews: L('{self} wraca na trasę w świetnej formie', '{self} is back on the trail in great shape') }], aiWeight: 1 },
    ],
  },
  {
    id: 'october_surprise',
    tier: 'major',
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
      return (0.3 + lead * 2) * scandalProne(c);
    },
    title: L('PAŹDZIERNIKOWA NIESPODZIANKA: kompromitujące dokumenty o {self}', 'OCTOBER SURPRISE: damaging documents about {self}'),
    text: L('Na kilka dni przed wyborami wielki dziennik publikuje dokumenty sugerujące ukrywanie konfliktu interesów przez {self}. To może zmienić wynik.', 'Days before the election a major newspaper publishes documents suggesting {self} hid a conflict of interest. This could swing the race.'),
    tone: 'breaking',
    choices: [
      { label: L('Pełna transparentność — konferencja prasowa', 'Full transparency — a press conference'), hint: L('Ograniczasz straty: średni spadek wizerunku.', 'You limit the damage: a medium hit to your image.'), effects: [{ k: 'fav', t: 'self', v: -3 }, { k: 'momentum', t: 'self', v: -0.08 }], news: L('{self}: „Nie mam nic do ukrycia” — wielogodzinna konferencja', '{self}: “I have nothing to hide” — an hours-long press conference'), aiWeight: 2 },
      { label: L('Atak na wiarygodność gazety', 'Attack the paper\'s credibility'), hint: L('Baza się mobilizuje, ale umiarkowani odchodzą.', 'The base rallies, but moderates walk away.'), effects: [{ k: 'fav', t: 'self', v: -5 }, { k: 'enthusiasm', t: 'self', v: 5 }, { k: 'momentum', t: 'self', v: -0.06 }], news: L('{self} nazywa publikację „spiskiem establishmentu”', '{self} calls the story “an establishment conspiracy”'), aiWeight: 2 },
      { label: L('Przeczekać i milczeć', 'Stay silent and wait it out'), hint: L('Ryzykowne: przeciwnicy narzucą narrację.', 'Risky: your opponents will set the narrative.'), effects: [{ k: 'chance', p: 0.4, yes: [{ k: 'fav', t: 'self', v: -1.5 }], no: [{ k: 'fav', t: 'self', v: -7 }, { k: 'momentum', t: 'self', v: -0.15 }], yesNews: L('Sprawa {self} gubi się w natłoku wiadomości', 'The {self} story gets lost in the news cycle'), noNews: L('Milczenie {self} tylko podsyca aferę', '{self}\'s silence only fuels the scandal') }], aiWeight: 1 },
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
    title: L('Wielki związek zawodowy rozważa poparcie {self}', 'A major labor union considers endorsing {self}'),
    text: L('Federacja związków przemysłowych z Pasa Rdzy jest gotowa poprzeć {self} — w zamian za twarde zobowiązania w sprawie ochrony miejsc pracy.', 'A federation of Rust Belt industrial unions is ready to endorse {self} — in exchange for firm commitments to protect jobs.'),
    tone: 'good',
    choices: [
      { label: L('Przyjąć warunki związkowców', 'Accept the union\'s terms'), hint: L('Duży zysk w Pasie Rdzy (MI, PA, WI, OH), stanowisko w sprawie pracy przesuwa się w lewo.', 'Big gains in the Rust Belt (MI, PA, WI, OH); your jobs stance shifts left.'), effects: [{ k: 'position', t: 'self', issue: 'jobs', v: -15 }, { k: 'local', t: 'self', v: 0.06, states: [...RUST_BELT] }, { k: 'enthusiasm', t: 'self', v: 2 }, { k: 'key', text: L('Związki zawodowe popierają {self}', 'Labor unions endorse {self}'), impact: 3 }], news: L('Związkowcy z Pasa Rdzy popierają {self}', 'Rust Belt unions endorse {self}'), tone: 'good', aiWeight: 3 },
      { label: L('Odmówić', 'Decline'), hint: L('Zachowujesz swój program. Bez zmian.', 'You keep your platform. No change.'), effects: [{ k: 'local', t: 'self', v: -0.01, states: [...RUST_BELT] }], news: L('{self} odrzuca warunki związków zawodowych', '{self} rejects the unions\' terms'), aiWeight: 1 },
    ],
  },
  {
    id: 'super_pac',
    category: 'opportunity',
    icon: '🏦',
    weight: 1,
    cooldown: 30,
    target: 'candidate',
    title: L('Komitet Super PAC oferuje wsparcie dla {self}', 'A Super PAC offers to back {self}'),
    text: L('Grupa miliarderów chce przeznaczyć 15 milionów dolarów na reklamy wspierające {self}. Nieoficjalnie oczekują przychylności dla swojej branży.', 'A group of billionaires wants to spend $15 million on ads supporting {self}. Off the record, they expect favors for their industry.'),
    choices: [
      { label: L('Przyjąć pieniądze', 'Take the money'), hint: L('+$15 mln, lekki spadek wizerunku.', '+$15M, a slight hit to your image.'), effects: [{ k: 'funds', t: 'self', v: 15 }, { k: 'fav', t: 'self', v: -1.5 }], news: L('Komitet Super PAC wspiera {self} kwotą 15 mln dolarów', 'Super PAC backs {self} with $15 million'), aiWeight: 3 },
      { label: L('Odmówić — „nie jestem na sprzedaż”', 'Refuse — “I am not for sale”'), hint: L('Poprawa wizerunku i entuzjazmu.', 'Better image and enthusiasm.'), effects: [{ k: 'fav', t: 'self', v: 1.5 }, { k: 'enthusiasm', t: 'self', v: 2 }], news: L('{self} odrzuca miliony od miliarderów', '{self} turns down billionaires\' millions'), tone: 'good', aiWeight: 1 },
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
    title: L('{self} bije rekordy popularności w sieci', '{self} breaks online popularity records'),
    text: L('Spontaniczna rozmowa {self} z kelnerką z Ohio ma ponad 40 mln wyświetleń. Młodzi wyborcy szaleją.', '{self}\'s spontaneous chat with a waitress in Ohio has over 40 million views. Young voters love it.'),
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
    title: L('Gwiazda muzyki popiera {self}', 'Music superstar endorses {self}'),
    text: L('Jedna z najpopularniejszych artystek w kraju zaapelowała do swoich 200 mln obserwujących o głosowanie na {self}.', 'One of the country\'s most popular artists urged her 200 million followers to vote for {self}.'),
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
    title: L('Popularny gubernator {state} popiera {self}', 'Popular governor of {state} endorses {self}'),
    text: L('Gubernator {state}, ciesząca się 60% poparcia, ogłosiła, że zagłosuje na {self} i ruszy z kandydatem w trasę po stanie.', 'The governor of {state}, with a 60% approval rating, announced she will vote for {self} and campaign with the candidate across the state.'),
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
    title: L('Wyciek strategii kampanii {other}', '{other}\'s campaign strategy leaked'),
    text: L('Sztab {self} otrzymał anonimowo wewnętrzną notatkę kampanii {other}, z cynicznymi komentarzami o wyborcach.', '{self}\'s campaign anonymously received an internal memo from {other}\'s campaign, full of cynical remarks about voters.'),
    choices: [
      { label: L('Ujawnić notatkę mediom', 'Leak the memo to the press'), hint: L('Mocno uderza w rywala, ale 30% ryzyka, że afera obróci się przeciwko Tobie.', 'Hits your rival hard, but there is a 30% risk the scandal backfires on you.'), effects: [{ k: 'chance', p: 0.7, yes: [{ k: 'fav', t: 'other', v: -4 }, { k: 'momentum', t: 'other', v: -0.08 }, { k: 'key', text: L('Wyciek notatki kampanii {other}', '{other}\'s campaign memo leaked'), impact: -4, t: 'other' }], no: [{ k: 'fav', t: 'self', v: -4 }, { k: 'momentum', t: 'self', v: -0.06 }], yesNews: L('Notatka sztabu {other} wywołuje burzę', '{other}\'s campaign memo sparks an uproar'), noNews: L('Afera: sztab {self} wykorzystał skradzione dokumenty', 'Scandal: {self}\'s campaign used stolen documents') }], aiWeight: 2 },
      { label: L('Zwrócić dokumenty i nie wykorzystywać', 'Return the documents and don\'t use them'), hint: L('Zyskujesz wizerunek uczciwego polityka.', 'You earn a reputation as an honest politician.'), effects: [{ k: 'fav', t: 'self', v: 2 }], news: L('{self} odmawia wykorzystania wykradzionych dokumentów rywala', '{self} refuses to use the rival\'s stolen documents'), tone: 'good', aiWeight: 1 },
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
    title: L('Kampania dezinformacji wymierzona w {self}', 'Disinformation campaign targets {self}'),
    text: L('Zagraniczne farmy trolli rozpowszechniają spreparowane, fałszywe nagranie z {self}. Platformy reagują powoli.', 'Foreign troll farms are spreading a deepfake video of {self}. Platforms are slow to react.'),
    tone: 'bad',
    choices: [
      { label: L('Ostro zareagować i zgłosić sprawę FBI', 'React forcefully and report it to the FBI'), hint: L('Ograniczasz szkody, temat bezpieczeństwa zyskuje na znaczeniu.', 'You limit the damage; national security gains attention.'), effects: [{ k: 'fav', t: 'self', v: -0.5 }, { k: 'salience', issue: 'foreign', v: 0.15 }], news: L('{self} alarmuje: obce państwo ingeruje w wybory', '{self} warns: a foreign power is interfering in the election'), aiWeight: 2 },
      { label: L('Zignorować', 'Ignore it'), hint: L('50% szans, że fałszywka sama zniknie.', '50% chance the fake fades away on its own.'), effects: [{ k: 'chance', p: 0.5, yes: [], no: [{ k: 'fav', t: 'self', v: -3.5 }], noNews: L('Fałszywe nagranie z {self} obejrzało już 30 mln osób', 'The {self} deepfake has already been seen by 30 million people') }], aiWeight: 1 },
    ],
  },
  // ---------------- world events ----------------
  {
    id: 'hurricane',
    tier: 'major',
    category: 'disaster',
    icon: '🌀',
    weight: 0.8,
    cooldown: 25,
    target: 'world',
    states: DISASTER_COAST,
    issue: 'climate',
    title: L('Huragan uderza w {state}', 'Hurricane hits {state}'),
    text: L('Huragan kategorii 4 spustoszył wybrzeże {state}. Setki tysięcy ludzi bez prądu. Kampanie muszą zdecydować, jak zareagować.', 'A Category 4 hurricane devastated the coast of {state}. Hundreds of thousands are without power. Campaigns must decide how to respond.'),
    tone: 'breaking',
    effects: [{ k: 'salience', issue: 'climate', v: 0.25 }, { k: 'econ', field: 'gdp', v: -0.2 }],
    choices: [
      { label: L('Odwiedzić poszkodowanych', 'Visit the victims'), hint: L('Zysk w {state}, ale ryzyko oskarżeń o „sesję zdjęciową”.', 'Gains in {state}, but risk of “photo-op” accusations.'), effects: [{ k: 'stamina', t: 'self', v: -10 }, { k: 'chance', p: 0.75, yes: [{ k: 'local', t: 'self', v: 0.05 }, { k: 'fav', t: 'self', v: 1 }], no: [{ k: 'local', t: 'self', v: -0.03 }], yesNews: L('{self} pomaga przy rozładunku darów w {state}', '{self} helps unload relief supplies in {state}'), noNews: L('Krytyka: wizyta {self} utrudniła akcję ratunkową', 'Criticism: {self}\'s visit hampered the rescue effort') }], aiWeight: 2 },
      { label: L('Zorganizować zbiórkę pomocy', 'Organize a relief fundraiser'), hint: L('-$2 mln, solidny zysk wizerunkowy.', '-$2M, a solid image boost.'), effects: [{ k: 'funds', t: 'self', v: -2 }, { k: 'fav', t: 'self', v: 1.5 }, { k: 'local', t: 'self', v: 0.03 }], news: L('Kampania {self} przekazuje miliony dla ofiar huraganu', '{self}\'s campaign donates millions to hurricane victims'), tone: 'good', aiWeight: 2 },
      { label: L('Kontynuować kampanię', 'Keep campaigning'), hint: L('Bez kosztów, ale lekka strata lokalnie.', 'No cost, but a small local loss.'), effects: [{ k: 'local', t: 'self', v: -0.02 }], aiWeight: 1 },
    ],
    impact: 0,
  },
  {
    id: 'intl_crisis',
    tier: 'major',
    category: 'world',
    icon: '🌐',
    weight: 0.8,
    cooldown: 30,
    target: 'world',
    issue: 'foreign',
    title: L('Kryzys międzynarodowy: napięcie na Morzu Południowochińskim', 'International crisis: tensions in the South China Sea'),
    text: L('Okręty dwóch mocarstw o mały włos nie zderzyły się w cieśninie. Rynki nerwowo reagują, a wyborcy pytają, kto lepiej poradzi sobie jako głównodowodzący.', 'Warships of two great powers nearly collided in the strait. Markets are jittery and voters ask who would be the better commander-in-chief.'),
    tone: 'breaking',
    effects: [{ k: 'salience', issue: 'foreign', v: 0.45 }, { k: 'econ', field: 'gas', v: 0.15 }, { k: 'econ', field: 'stocks', v: -120 }, { k: 'interest', v: 2 }],
    choices: [
      { label: L('Twarda postawa: „Ameryka się nie ugnie”', 'Hard line: “America will not back down”'), hint: L('Zyskujesz, jeśli masz doświadczenie lub konserwatywny profil.', 'Pays off if you are experienced or have a conservative profile.'), effects: [{ k: 'position', t: 'self', issue: 'foreign', v: 8 }, { k: 'momentum', t: 'self', v: 0.02 }], aiWeight: 2 },
      { label: L('Wezwanie do dyplomacji i sojuszników', 'Call for diplomacy and allies'), hint: L('Bezpieczne, uspokaja umiarkowanych.', 'Safe, reassures moderates.'), effects: [{ k: 'position', t: 'self', issue: 'foreign', v: -6 }, { k: 'fav', t: 'self', v: 1 }], aiWeight: 2 },
      { label: L('Wstrzymać się od komentarzy', 'Withhold comment'), hint: L('Unikasz ryzyka, ale wyglądasz na niezdecydowanego.', 'You avoid risk, but look indecisive.'), effects: [{ k: 'momentum', t: 'self', v: -0.02 }], aiWeight: 1 },
    ],
  },
  {
    id: 'border_surge',
    tier: 'major',
    category: 'crisis',
    icon: '🛂',
    weight: 0.8,
    cooldown: 30,
    target: 'world',
    states: BORDER,
    issue: 'immigration',
    title: L('Rekordowa liczba przekroczeń granicy w {state}', 'Record border crossings in {state}'),
    text: L('Służby graniczne raportują rekordową liczbę zatrzymań. Władze {state} ogłaszają stan wyjątkowy.', 'Border agents report record apprehensions. Authorities in {state} declare a state of emergency.'),
    tone: 'breaking',
    effects: [{ k: 'salience', issue: 'immigration', v: 0.45 }],
    choices: [
      { label: L('Pojechać na granicę', 'Go to the border'), hint: L('Silny sygnał — opłaca się, jeśli Twoje stanowisko jest bliskie wyborcom.', 'A strong signal — pays off if your stance is close to voters\'.'), effects: [{ k: 'stamina', t: 'self', v: -10 }, { k: 'local', t: 'self', v: 0.03 }, { k: 'salience', issue: 'immigration', v: 0.1 }], aiWeight: 2 },
      { label: L('Przedstawić plan reformy imigracyjnej', 'Present an immigration reform plan'), hint: L('Lekko przesuwa Cię do centrum w sprawie imigracji, +wizerunek.', 'Moves you slightly toward the center on immigration, +image.'), effects: [{ k: 'moderate', t: 'self', issue: 'immigration', v: 0.3 }, { k: 'fav', t: 'self', v: 1 }], aiWeight: 2 },
      { label: L('Zmienić temat', 'Change the subject'), hint: L('Zmniejsza znaczenie tematu, ale -impet.', 'Lowers the issue\'s salience, but -momentum.'), effects: [{ k: 'salience', issue: 'immigration', v: -0.15 }, { k: 'momentum', t: 'self', v: -0.02 }], aiWeight: 1 },
    ],
  },
  {
    id: 'market_crash',
    tier: 'major',
    category: 'economy',
    icon: '📉',
    weight: 0.5,
    cooldown: 50,
    target: 'world',
    title: L('Krach na Wall Street: S&P 500 traci 7% w jeden dzień', 'Wall Street crash: S&P 500 loses 7% in a single day'),
    text: L('Panika na giełdach po bankructwie dużego funduszu. Ekonomiści ostrzegają przed recesją. Wyborcy patrzą na partię rządzącą.', 'Panic on the markets after a major fund collapses. Economists warn of a recession. Voters look at the party in power.'),
    tone: 'breaking',
    effects: [{ k: 'econ', field: 'gdp', v: -1.1 }, { k: 'econ', field: 'unemployment', v: 0.3 }, { k: 'econ', field: 'stocks', v: -380 }, { k: 'approval', v: -3 }, { k: 'salience', issue: 'economy', v: 0.5 }],
    impact: 0,
  },
  {
    id: 'gas_drop',
    category: 'economy',
    icon: '⛽',
    weight: 0.5,
    cooldown: 40,
    target: 'world',
    title: L('Ceny benzyny spadają najszybciej od lat', 'Gas prices are falling at the fastest rate in years'),
    text: L('OPEC zwiększa wydobycie, a średnia cena paliwa spada. Kierowcy oddychają z ulgą.', 'OPEC boosts output and the average gas price drops. Drivers breathe a sigh of relief.'),
    tone: 'good',
    effects: [{ k: 'econ', field: 'gas', v: -0.4 }, { k: 'econ', field: 'inflation', v: -0.3 }, { k: 'approval', v: 1.5 }, { k: 'salience', issue: 'inflation', v: -0.15 }],
  },
  {
    id: 'scotus',
    tier: 'major',
    category: 'world',
    icon: '⚖️',
    weight: 0.6,
    cooldown: 45,
    once: true,
    target: 'world',
    issue: 'social',
    title: L('Przełomowy wyrok Sądu Najwyższego', 'Landmark Supreme Court ruling'),
    text: L('Sąd Najwyższy wydał kontrowersyjne orzeczenie w sprawie światopoglądowej. Protesty przed budynkiem sądu, a temat dominuje w mediach.', 'The Supreme Court issued a controversial ruling on a social issue. Protesters gather outside the court and the story dominates the news.'),
    tone: 'breaking',
    effects: [{ k: 'salience', issue: 'social', v: 0.55 }],
    choices: [
      { label: L('Zdecydowanie skomentować wyrok', 'Comment forcefully on the ruling'), hint: L('Mobilizuje Twoją bazę (+entuzjazm).', 'Fires up your base (+enthusiasm).'), effects: [{ k: 'enthusiasm', t: 'self', v: 4 }, { k: 'fav', t: 'self', v: -0.5 }], aiWeight: 2 },
      { label: L('Wezwać do spokoju i kompromisu', 'Call for calm and compromise'), hint: L('Zyskujesz u umiarkowanych.', 'You gain with moderates.'), effects: [{ k: 'fav', t: 'self', v: 1.2 }, { k: 'enthusiasm', t: 'self', v: -1 }], aiWeight: 1 },
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
    title: L('Fala przestępczości w {state}', 'Crime wave in {state}'),
    text: L('Seria brutalnych napadów w największym mieście {state} wstrząsnęła opinią publiczną. Bezpieczeństwo wraca na czołówki.', 'A string of violent robberies in the largest city of {state} shocked the public. Crime is back in the headlines.'),
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
    title: L('Strajk w fabrykach samochodów w {state}', 'Auto workers strike in {state}'),
    text: L('45 tysięcy pracowników przemysłu motoryzacyjnego w {state} odchodzi od taśm. Kandydaci są pytani, po czyjej stronie stoją.', '45,000 auto workers in {state} walk off the line. Candidates are asked whose side they are on.'),
    tone: 'neutral',
    effects: [{ k: 'salience', issue: 'jobs', v: 0.35 }, { k: 'econ', field: 'gdp', v: -0.15 }],
    choices: [
      { label: L('Stanąć na pikiecie z robotnikami', 'Join the workers on the picket line'), hint: L('Zysk w {state} i regionie; przesunięcie w lewo w sprawie pracy.', 'Gains in {state} and the region; your jobs stance shifts left.'), effects: [{ k: 'local', t: 'self', v: 0.04, region: true }, { k: 'position', t: 'self', issue: 'jobs', v: -8 }], aiWeight: 2 },
      { label: L('Wezwać obie strony do porozumienia', 'Urge both sides to reach a deal'), hint: L('Neutralnie, lekki plus wizerunkowy.', 'Neutral, a small image boost.'), effects: [{ k: 'fav', t: 'self', v: 0.6 }], aiWeight: 2 },
      { label: L('Poprzeć zarządy firm', 'Side with management'), hint: L('Przesunięcie w prawo, strata w {state}.', 'Shifts you right, losses in {state}.'), effects: [{ k: 'local', t: 'self', v: -0.04 }, { k: 'position', t: 'self', issue: 'jobs', v: 8 }], aiWeight: 1 },
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
    title: L('Ogromne pożary lasów w {state}', 'Massive wildfires in {state}'),
    text: L('Pożary strawiły setki tysięcy akrów w {state}. Dym dociera aż do wschodniego wybrzeża. Debata o klimacie wraca z całą siłą.', 'Fires burned hundreds of thousands of acres in {state}. Smoke reaches the East Coast. The climate debate returns in force.'),
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
    title: L('Koncern farmaceutyczny podnosi cenę insuliny o 300%', 'Drug company hikes insulin price by 300%'),
    text: L('Oburzenie po decyzji koncernu. Historia chorej nastolatki, której rodziny nie stać na leki, obiegła wszystkie media.', 'Outrage after the company\'s decision. The story of a sick teenager whose family cannot afford medicine is everywhere.'),
    tone: 'bad',
    effects: [{ k: 'salience', issue: 'healthcare', v: 0.4 }],
  },

  // ---------------- minor news (frequent, small effects) ----------------
  { id: 'podcast', category: 'media', icon: '🎧', weight: 1, cooldown: 8, target: 'candidate', tier: 'minor', targetWeight: (c) => c.stats.media / 50, title: L('{self} błyszczy w popularnym podcaście', '{self} shines on a popular podcast'), text: L('Trzygodzinna rozmowa przyciągnęła miliony słuchaczy, głównie młodych mężczyzn.', 'The three-hour conversation drew millions of listeners, mostly young men.'), tone: 'good', effects: [{ k: 'buzz', t: 'self', v: 0.12 }, { k: 'momentum', t: 'self', v: 0.01 }] },
  { id: 'aide_gaffe', category: 'media', icon: '🗯️', weight: 1, cooldown: 8, target: 'candidate', tier: 'minor', targetWeight: lowDiscipline, title: L('Kontrowersyjna wypowiedź rzecznika kampanii {self}', 'Controversial remark by {self}\'s campaign spokesperson'), text: L('Rzecznik sztabu musiał przepraszać za lekceważący komentarz w telewizji.', 'The campaign spokesperson had to apologize for a dismissive comment on TV.'), tone: 'bad', effects: [{ k: 'fav', t: 'self', v: -0.7 }] },
  { id: 'factory', category: 'economy', icon: '🏭', weight: 0.8, cooldown: 10, target: 'world', tier: 'minor', states: ['MI', 'OH', 'PA', 'GA', 'NC', 'AZ', 'TX', 'IN', 'WI', 'TN'], title: L('Nowa fabryka półprzewodników w {state} — 3 tys. miejsc pracy', 'New semiconductor plant in {state} — 3,000 jobs'), text: L('Inwestycja jest prezentowana jako sukces gospodarczy administracji.', 'The investment is touted as an economic win for the administration.'), tone: 'good', effects: [{ k: 'approval', v: 0.4 }, { k: 'econ', field: 'unemployment', v: -0.02 }] },
  { id: 'mayor_endorse', category: 'endorsement', icon: '🏙️', weight: 1, cooldown: 6, target: 'candidate', tier: 'minor', states: SWING, title: L('Burmistrz dużego miasta w {state} popiera {self}', 'Big-city mayor in {state} endorses {self}'), text: L('Lokalne poparcie może pomóc w mobilizacji wyborców.', 'Local support may help turn out voters.'), tone: 'good', effects: [{ k: 'local', t: 'self', v: 0.015 }] },
  { id: 'newspaper', category: 'endorsement', icon: '📰', weight: 0.6, cooldown: 12, minProgress: 0.5, target: 'candidate', tier: 'minor', title: L('Redakcja wpływowego dziennika popiera {self}', 'Influential newspaper endorses {self}'), text: L('Kolegium redakcyjne opublikowało długi tekst rekomendujący kandydata.', 'The editorial board published a long piece recommending the candidate.'), tone: 'good', effects: [{ k: 'fav', t: 'self', v: 0.8 }] },
  { id: 'protest', category: 'world', icon: '✊', weight: 0.7, cooldown: 10, target: 'world', tier: 'minor', states: ['CA', 'NY', 'IL', 'OR', 'WA', 'MN', 'GA', 'PA'], title: L('Duże protesty uliczne w {state}', 'Large street protests in {state}'), text: L('Tysiące ludzi wyszły na ulice. Temat porządku publicznego i praw obywatelskich wraca do mediów.', 'Thousands took to the streets. Public order and civil rights are back in the news.'), effects: [{ k: 'salience', issue: 'social', v: 0.1 }, { k: 'salience', issue: 'security', v: 0.1 }] },
  { id: 'factcheck', category: 'media', icon: '🔎', weight: 1, cooldown: 8, target: 'candidate', tier: 'minor', targetWeight: lowIntegrity, title: L('Weryfikatorzy faktów punktują {self}', 'Fact-checkers call out {self}'), text: L('Trzy twierdzenia z ostatniego wystąpienia oznaczono jako „mylące”.', 'Three claims from the latest speech were rated “misleading”.'), tone: 'bad', effects: [{ k: 'fav', t: 'self', v: -0.6 }] },
  { id: 'online_record', category: 'social', icon: '💸', weight: 0.8, cooldown: 10, target: 'candidate', tier: 'minor', targetWeight: (c) => c.stats.grassroots / 50, title: L('Rekordowy dzień zbiórki online {self}', 'Record online fundraising day for {self}'), text: L('Średnia wpłata: 32 dolary. Drobni darczyńcy wciąż są zmobilizowani.', 'Average donation: $32. Small donors are still fired up.'), tone: 'good', effects: [{ k: 'funds', t: 'self', v: 1.5, src: 'small' }, { k: 'enthusiasm', t: 'self', v: 1 }] },
  { id: 'actor_endorse', category: 'endorsement', icon: '🎬', weight: 0.8, cooldown: 8, target: 'candidate', tier: 'minor', title: L('Znany aktor nagrywa film wspierający {self}', 'Famous actor records a video backing {self}'), text: L('Film obejrzało kilka milionów osób w ciągu doby.', 'The video was viewed by several million people within a day.'), tone: 'good', effects: [{ k: 'buzz', t: 'self', v: 0.15 }] },
  { id: 'shakeup', category: 'campaign', icon: '🔄', weight: 0.6, cooldown: 20, target: 'candidate', tier: 'minor', targetWeight: (c) => (c.momentum < 0 ? 2 : 0.5), title: L('Zmiany w sztabie {self}', 'Shake-up in {self}\'s campaign'), text: L('Kierownik kampanii odchodzi. Media piszą o napięciach w zespole.', 'The campaign manager is leaving. The press reports tension in the team.'), tone: 'bad', effects: [{ k: 'fav', t: 'self', v: -0.4 }, { k: 'stamina', t: 'self', v: -5 }] },
  { id: 'football', category: 'campaign', icon: '🏈', weight: 0.7, cooldown: 12, target: 'candidate', tier: 'minor', states: SWING, title: L('{self} na meczu futbolu w {state}', '{self} at a football game in {state}'), text: L('Zdjęcia z trybun rozeszły się po lokalnych mediach.', 'Photos from the stands spread across local media.'), effects: [{ k: 'local', t: 'self', v: 0.01 }, { k: 'buzz', t: 'self', v: 0.05 }] },
  { id: 'meme', category: 'social', icon: '😂', weight: 0.8, cooldown: 8, target: 'candidate', tier: 'minor', targetWeight: (c) => c.stats.media / 60, title: L('Mem z {self} podbija internet', 'A meme of {self} takes over the internet'), text: L('Nie wiadomo jeszcze, czy to pomoże, czy zaszkodzi.', 'It\'s not yet clear whether it will help or hurt.'), effects: [{ k: 'chance', p: 0.6, yes: [{ k: 'buzz', t: 'self', v: 0.15 }], no: [{ k: 'buzz', t: 'self', v: -0.1 }, { k: 'fav', t: 'self', v: -0.3 }] }] },
  { id: 'volunteers', category: 'campaign', icon: '🚪', weight: 0.8, cooldown: 8, target: 'candidate', tier: 'minor', states: SWING, targetWeight: (c) => c.stats.grassroots / 50, title: L('Wolontariusze {self} odwiedzili 100 tys. domów w {state}', '{self}\'s volunteers knocked on 100,000 doors in {state}'), text: L('Sztab chwali się rekordowym weekendem w terenie.', 'The campaign boasts of a record weekend in the field.'), tone: 'good', effects: [{ k: 'local', t: 'self', v: 0.012 }, { k: 'enthusiasm', t: 'self', v: 0.5 }] },
  { id: 'weather_good', category: 'economy', icon: '📈', weight: 0.6, cooldown: 14, target: 'world', tier: 'minor', title: L('Sprzedaż detaliczna rośnie szybciej od oczekiwań', 'Retail sales grow faster than expected'), text: L('Amerykanie wydają więcej — ekonomiści odnotowują poprawę nastrojów.', 'Americans are spending more — economists see improving sentiment.'), tone: 'good', effects: [{ k: 'econ', field: 'gdp', v: 0.1 }, { k: 'approval', v: 0.4 }] },
  { id: 'housing', category: 'economy', icon: '🏠', weight: 0.6, cooldown: 14, target: 'world', tier: 'minor', title: L('Ceny mieszkań biją kolejny rekord', 'Home prices hit another record'), text: L('Coraz mniej młodych Amerykanów stać na własny dom.', 'Fewer and fewer young Americans can afford a home.'), tone: 'bad', effects: [{ k: 'salience', issue: 'inflation', v: 0.08 }, { k: 'approval', v: -0.3 }] },
  { id: 'campus', category: 'world', icon: '🎓', weight: 0.5, cooldown: 14, target: 'world', tier: 'minor', title: L('Spór o czesne na uniwersytetach stanowych', 'Fight over tuition at state universities'), text: L('Studenci protestują przeciw podwyżkom opłat.', 'Students protest against fee hikes.'), effects: [{ k: 'salience', issue: 'education', v: 0.12 }] },

  // ---------------- calendar events ----------------
  {
    id: 'vp_pick',
    category: 'campaign',
    icon: '🤝',
    weight: 0,
    cooldown: 0,
    target: 'candidate',
    scheduled: true,
    tier: 'moderate',
    stateFor: (g, candId) => {
      const last = g.history[g.history.length - 1];
      const idx = g.candidates.findIndex((c) => c.id === candId);
      const home = g.candidates[idx].homeState;
      const pool = SWING.filter((s) => s !== home);
      if (!last) return pool[0];
      return [...pool].sort((a, b) => {
        const m = (code: string) => {
          const arr = last.stateEst[code];
          return Math.abs(arr[idx] - Math.max(...arr.filter((_, i) => i !== idx)));
        };
        return m(a) - m(b);
      })[0];
    },
    title: L('{self} wybiera kandydata na wiceprezydenta', '{self} picks a running mate'),
    text: L('Sztab przedstawił krótką listę. To pierwsza decyzja, która pokaże, jaką prezydenturę planuje kandydat.', 'The campaign presented a shortlist. It is the first decision that shows what kind of presidency the candidate plans.'),
    choices: [
      { label: L('Popularny polityk ze stanu wahającego się ({state})', 'A popular politician from a swing state ({state})'), hint: L('Wyraźny zysk w {state} i okolicach, niewielki efekt ogólnokrajowy.', 'A clear gain in {state} and nearby, a small national effect.'), effects: [{ k: 'local', t: 'self', v: 0.06 }, { k: 'local', t: 'self', v: 0.015, region: true }, { k: 'stat', t: 'self', stat: 'experience', v: 2 }], news: L('{self} ogłasza kandydata na wiceprezydenta — wybór pada na polityka ze stanu {state}', '{self} announces a running mate — a politician from {state}'), tone: 'good', aiWeight: 3 },
      { label: L('Doświadczony weteran Waszyngtonu', 'An experienced Washington veteran'), hint: L('Doświadczenie i wiarygodność w górę, mniej entuzjazmu bazy.', 'Experience and credibility up, less enthusiasm from the base.'), effects: [{ k: 'stat', t: 'self', stat: 'experience', v: 8 }, { k: 'stat', t: 'self', stat: 'integrity', v: 3 }, { k: 'enthusiasm', t: 'self', v: -1 }, { k: 'fav', t: 'self', v: 1 }], news: L('{self} stawia na doświadczenie: na wiceprezydenta kandyduje wieloletni senator', '{self} bets on experience: a longtime senator joins the ticket'), aiWeight: 2 },
      { label: L('Młoda, wyrazista postać', 'A young, outspoken figure'), hint: L('Entuzjazm i rozgłos w internecie, ale większe ryzyko kontrowersji.', 'Enthusiasm and online buzz, but a higher risk of controversy.'), effects: [{ k: 'buzz', t: 'self', v: 0.35 }, { k: 'enthusiasm', t: 'self', v: 4 }, { k: 'stat', t: 'self', stat: 'media', v: 6 }, { k: 'stat', t: 'self', stat: 'scandalRisk', v: 6 }], news: L('{self} zaskakuje: kandydatem na wiceprezydenta jest wschodząca gwiazda partii', '{self} surprises: the running mate is a rising party star'), tone: 'good', aiWeight: 1 },
      { label: L('Umiarkowany centrysta', 'A moderate centrist'), hint: L('Przyciąga niezależnych i umiarkowanych (program przesuwa się do centrum), baza mniej zachwycona.', 'Attracts independents and moderates (platform moves to the center); the base is less thrilled.'), effects: [{ k: 'moderate', t: 'self', issue: 'economy', v: 0.2 }, { k: 'moderate', t: 'self', issue: 'social', v: 0.2 }, { k: 'moderate', t: 'self', issue: 'immigration', v: 0.15 }, { k: 'fav', t: 'self', v: 1.5 }, { k: 'enthusiasm', t: 'self', v: -2 }], news: L('{self} wyciąga rękę do centrum — wiceprezydentem ma być umiarkowany gubernator', '{self} reaches to the center — a moderate governor will be the running mate'), aiWeight: 2 },
    ],
  },
  {
    id: 'primary_unity',
    category: 'campaign',
    icon: '🗳️',
    weight: 0,
    cooldown: 0,
    target: 'candidate',
    scheduled: true,
    tier: 'minor',
    title: L('Przegrany rywal z prawyborów: poparcie dla {self} pod znakiem zapytania', 'Defeated primary rival: support for {self} in doubt'),
    text: L('Pokonany w prawyborach polityk ma lojalnych zwolenników. Bez jego poparcia część bazy może zostać w domu.', 'The politician defeated in the primaries has loyal followers. Without an endorsement, part of the base may stay home.'),
    choices: [
      { label: L('Przyjąć część jego postulatów', 'Adopt some of the rival\'s proposals'), hint: L('Baza zachwycona (+entuzjazm), program przesuwa się od centrum.', 'The base is thrilled (+enthusiasm); the platform moves away from the center.'), effects: [{ k: 'enthusiasm', t: 'self', v: 5 }, { k: 'toBase', t: 'self', v: 0.2 }, { k: 'fav', t: 'self', v: -0.5 }], news: L('Jedność partii: rywal z prawyborów popiera {self} po ustępstwach programowych', 'Party unity: primary rival endorses {self} after policy concessions'), tone: 'good', aiWeight: 2 },
      { label: L('Zaproponować mu rolę w kampanii', 'Offer the rival a campaign role'), hint: L('Umiarkowany wzrost entuzjazmu, kosztuje $2 mln.', 'A moderate enthusiasm boost, costs $2M.'), effects: [{ k: 'enthusiasm', t: 'self', v: 3 }, { k: 'funds', t: 'self', v: -2 }], news: L('Były rywal {self} zostaje współprzewodniczącym kampanii', '{self}\'s former rival becomes campaign co-chair'), aiWeight: 2 },
      { label: L('Zignorować', 'Ignore it'), hint: L('Bez kosztów, ale część zwolenników rywala się zniechęci.', 'No cost, but some of the rival\'s supporters will be discouraged.'), effects: [{ k: 'enthusiasm', t: 'self', v: -3 }], news: L('Rywal z prawyborów odmawia poparcia dla {self}', 'Primary rival refuses to endorse {self}'), tone: 'bad', aiWeight: 1 },
    ],
  },
  {
    id: 'convention',
    category: 'campaign',
    icon: '🎉',
    weight: 0,
    cooldown: 0,
    target: 'candidate',
    scheduled: true,
    tier: 'major',
    title: L('Konwencja krajowa: {self} przyjmuje nominację', 'National convention: {self} accepts the nomination'),
    text: L('Cztery dni przemówień, balony i miliony widzów przed telewizorami. Jaki ma być główny przekaz konwencji?', 'Four days of speeches, balloons and millions of viewers at home. What should the convention\'s main message be?'),
    choices: [
      { label: L('Jedność partii', 'Party unity'), hint: L('Silna mobilizacja bazy: duży wzrost entuzjazmu.', 'Strong base mobilization: a big boost in enthusiasm.'), effects: [{ k: 'enthusiasm', t: 'self', v: 6 }, { k: 'momentum', t: 'self', v: 0.08 }, { k: 'interest', v: 2 }], news: L('Zjednoczona partia: udana konwencja {self}', 'A united party: a successful convention for {self}'), tone: 'good', aiWeight: 2 },
      { label: L('Ręka wyciągnięta do centrum', 'A hand extended to the center'), hint: L('Lepszy wizerunek wśród niezależnych, nieco słabsza mobilizacja.', 'Better image among independents, slightly weaker mobilization.'), effects: [{ k: 'fav', t: 'self', v: 3 }, { k: 'momentum', t: 'self', v: 0.06 }, { k: 'moderate', t: 'self', issue: 'economy', v: 0.12 }, { k: 'moderate', t: 'self', issue: 'social', v: 0.12 }, { k: 'interest', v: 2 }], news: L('{self} na konwencji: „Będę prezydentem wszystkich Amerykanów”', '{self} at the convention: “I will be president for all Americans”'), tone: 'good', aiWeight: 2 },
      { label: L('Ostra krytyka rywala', 'Sharp attack on the rival'), hint: L('Duży impuls medialny, ale część wyborców źle znosi negatywny ton.', 'A big media boost, but some voters dislike the negative tone.'), effects: [{ k: 'momentum', t: 'self', v: 0.1 }, { k: 'fav', t: 'self', v: -1 }, { k: 'fav', t: 'other', v: -2.5 }, { k: 'interest', v: 3 }], news: L('Konwencja {self}: zmasowany atak na {other}', '{self}\'s convention: an all-out attack on {other}'), aiWeight: 1 },
      { label: L('Wielkie show z gwiazdami', 'A big star-studded show'), hint: L('Rekordowa oglądalność i rozgłos wśród młodych.', 'Record ratings and buzz among young voters.'), effects: [{ k: 'buzz', t: 'self', v: 0.5 }, { k: 'enthusiasm', t: 'self', v: 3 }, { k: 'momentum', t: 'self', v: 0.07 }, { k: 'interest', v: 4 }], news: L('Gwiazdy na scenie: konwencja {self} z rekordową oglądalnością', 'Stars on stage: {self}\'s convention draws record ratings'), tone: 'good', aiWeight: 1 },
    ],
  },
];
