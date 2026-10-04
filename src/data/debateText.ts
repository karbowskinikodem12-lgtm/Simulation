import type { DebateApproach, IssueId } from '../engine/types';
import { L, type LStr } from '../i18n';

export const DEBATE_QUESTIONS: Record<IssueId, LStr[]> = {
  economy: [
    L('Wielu Amerykanów czuje, że gospodarka działa tylko dla bogatych. Co konkretnie Pan/Pani zmieni?', 'Many Americans feel the economy only works for the rich. What exactly will you change?'),
    L('Ekonomiści ostrzegają przed spowolnieniem. Jaki jest Pana/Pani plan na pierwsze 100 dni?', 'Economists warn of a slowdown. What is your plan for the first 100 days?'),
  ],
  inflation: [
    L('Ceny żywności wzrosły o jedną piątą w trzy lata. Jak obniży Pan/Pani koszty życia?', 'Grocery prices are up by a fifth in three years. How will you bring down the cost of living?'),
    L('Czy rząd powinien walczyć z inflacją kosztem wzrostu gospodarczego?', 'Should the government fight inflation at the expense of growth?'),
  ],
  jobs: [
    L('Fabryki w Pasie Rdzy wciąż się zamykają. Co powie Pan/Pani zwolnionemu robotnikowi z Ohio?', 'Rust Belt factories keep closing. What do you say to a laid-off worker in Ohio?'),
    L('Czy sztuczna inteligencja zabierze Amerykanom pracę — i co zamierza Pan/Pani z tym zrobić?', 'Will artificial intelligence take Americans’ jobs — and what will you do about it?'),
  ],
  immigration: [
    L('Granica południowa notuje rekordy. Jaka jest Pana/Pani polityka wobec nielegalnej imigracji?', 'The southern border is seeing record numbers. What is your policy on illegal immigration?'),
    L('Co zrobić z 11 milionami nieudokumentowanych imigrantów mieszkających w USA?', 'What should be done about the 11 million undocumented immigrants living in the US?'),
  ],
  taxes: [
    L('Czy klasa średnia zapłaci wyższe podatki za Pana/Pani prezydentury?', 'Will the middle class pay higher taxes under your presidency?'),
    L('Czy najbogatsi płacą sprawiedliwą część podatków?', 'Do the wealthiest pay their fair share in taxes?'),
  ],
  healthcare: [
    L('Miliony Amerykanów nie stać na leczenie. Jak naprawić system opieki zdrowotnej?', 'Millions of Americans cannot afford care. How do we fix the health system?'),
    L('Czy Obamacare powinna zostać utrzymana, zreformowana, czy uchylona?', 'Should Obamacare be kept, reformed or repealed?'),
  ],
  security: [
    L('Wskaźniki przestępczości w wielu miastach budzą niepokój. Jak zapewni Pan/Pani bezpieczeństwo?', 'Crime rates in many cities are alarming. How will you keep people safe?'),
    L('Jak zapobiegać masowym strzelaninom, szanując Drugą Poprawkę?', 'How do we prevent mass shootings while respecting the Second Amendment?'),
  ],
  foreign: [
    L('Jak powinna wyglądać polityka USA wobec Chin?', 'What should US policy toward China look like?'),
    L('Czy Ameryka powinna dalej finansować sojuszników w konfliktach zbrojnych?', 'Should America keep funding allies in armed conflicts?'),
  ],
  climate: [
    L('Czy zmiany klimatu to zagrożenie egzystencjalne, a jeśli tak — ile jest Pan/Pani gotów/gotowa za to zapłacić?', 'Is climate change an existential threat, and if so — how much are you willing to pay to fight it?'),
    L('Jak zapewnić tanią energię, nie niszcząc planety?', 'How do we keep energy cheap without destroying the planet?'),
  ],
  social: [
    L('Spory światopoglądowe dzielą kraj. Jak zamierza Pan/Pani być prezydentem wszystkich Amerykanów?', 'Culture wars divide the country. How will you be president for all Americans?'),
    L('Czy decyzje w sprawach sumienia powinny należeć do stanów, czy do Waszyngtonu?', 'Should matters of conscience be decided by the states or by Washington?'),
  ],
  education: [
    L('Dług studencki przekroczył 1,7 biliona dolarów. Co z tym zrobić?', 'Student debt has passed $1.7 trillion. What should be done about it?'),
    L('Kto powinien decydować o tym, czego uczą się dzieci w szkołach?', 'Who should decide what children learn in school?'),
  ],
};

export const APPROACH_META: Record<DebateApproach, { label: LStr; icon: string; desc: LStr; beats: DebateApproach }> = {
  facts: { label: L('Fakty i konkrety', 'Facts and specifics'), icon: '📊', desc: L('Liczby, plany, doświadczenie. Bezpieczne i stabilne. Silne przeciw atakom.', 'Numbers, plans, experience. Safe and steady. Strong against attacks.'), beats: 'attack' },
  attack: { label: L('Atak na rywala', 'Attack the opponent'), icon: '⚔️', desc: L('Punktuj słabości przeciwnika. Duża zmienność. Skuteczne przeciw unikom.', 'Hit the opponent’s weak spots. High variance. Effective against dodging.'), beats: 'pivot' },
  empathy: { label: L('Emocje i empatia', 'Emotion and empathy'), icon: '❤️', desc: L('Historie zwykłych ludzi. Bazuje na charyzmie i wiarygodności. Ożywia suche wywody.', 'Stories of ordinary people. Relies on charisma and credibility. Beats dry recitals.'), beats: 'facts' },
  pivot: { label: L('Unik i zmiana tematu', 'Dodge and pivot'), icon: '↪️', desc: L('Przekieruj rozmowę na swój mocny temat. Dobre, gdy temat Ci nie sprzyja. Neutralizuje emocje.', 'Steer to your strong topic. Good when the topic hurts you. Neutralizes emotional appeals.'), beats: 'empathy' },
};

export const ROUND_COMMENTARY: Record<DebateApproach, { good: LStr[]; bad: LStr[] }> = {
  facts: {
    good: [L('{name} sypie liczbami jak z rękawa — widać przygotowanie.', '{name} rattles off numbers — clearly well prepared.'), L('{name} przedstawia konkretny, przekonujący plan.', '{name} lays out a concrete, convincing plan.')],
    bad: [L('{name} gubi się w szczegółach — widzowie ziewają.', '{name} gets lost in the weeds — viewers are yawning.'), L('{name} myli dane, co natychmiast wychwytują weryfikatorzy faktów.', '{name} mixes up the data and fact-checkers pounce immediately.')],
  },
  attack: {
    good: [L('{name} zadaje celny cios — publiczność reaguje głośno.', '{name} lands a clean hit — the audience roars.'), L('Ostra riposta {name} na pewno trafi do memów.', '{name}’s sharp comeback is bound to become a meme.')],
    bad: [L('Atak {name} wypada agresywnie i małostkowo.', '{name}’s attack comes across as aggressive and petty.'), L('{name} przesadza — nawet życzliwi komentatorzy krzywią się.', '{name} goes too far — even friendly pundits wince.')],
  },
  empathy: {
    good: [L('{name} opowiada wzruszającą historię wyborczyni z Michigan.', '{name} tells a moving story about a voter from Michigan.'), L('{name} brzmi autentycznie — wskaźnik w grupie fokusowej szybuje.', '{name} sounds authentic — the focus-group dial soars.')],
    bad: [L('Emocjonalny apel {name} brzmi sztucznie i wyuczenie.', '{name}’s emotional appeal sounds rehearsed and fake.'), L('{name} unika konkretów, chowając się za anegdotami.', '{name} dodges specifics, hiding behind anecdotes.')],
  },
  pivot: {
    good: [L('{name} zręcznie przekierowuje rozmowę na swój najmocniejszy temat.', '{name} deftly steers the conversation to their strongest topic.'), L('Gładka zmiana tematu przez {name} — moderator nie zdążył zareagować.', 'A smooth pivot by {name} — the moderator never caught it.')],
    bad: [L('Moderator przyłapuje {name} na unikaniu pytania.', 'The moderator catches {name} dodging the question.'), L('{name} wyraźnie ucieka od odpowiedzi — widzowie to zauważają.', '{name} clearly evades the question — viewers notice.')],
  },
};
