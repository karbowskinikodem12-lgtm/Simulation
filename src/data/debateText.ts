import type { DebateApproach, IssueId } from '../engine/types';

export const DEBATE_QUESTIONS: Record<IssueId, string[]> = {
  economy: ['Wielu Amerykanów czuje, że gospodarka działa tylko dla bogatych. Co konkretnie Pan/Pani zmieni?', 'Ekonomiści ostrzegają przed spowolnieniem. Jaki jest Pana/Pani plan na pierwsze 100 dni?'],
  inflation: ['Ceny żywności wzrosły o jedną piątą w trzy lata. Jak obniży Pan/Pani koszty życia?', 'Czy rząd powinien walczyć z inflacją kosztem wzrostu gospodarczego?'],
  jobs: ['Fabryki w Pasie Rdzy wciąż się zamykają. Co powie Pan/Pani zwolnionemu robotnikowi z Ohio?', 'Czy sztuczna inteligencja zabierze Amerykanom pracę — i co zamierza Pan/Pani z tym zrobić?'],
  immigration: ['Granica południowa notuje rekordy. Jaka jest Pana/Pani polityka wobec nielegalnej imigracji?', 'Co zrobić z 11 milionami nieudokumentowanych imigrantów mieszkających w USA?'],
  taxes: ['Czy klasa średnia zapłaci wyższe podatki za Pana/Pani prezydentury?', 'Czy najbogatsi płacą sprawiedliwą część podatków?'],
  healthcare: ['Miliony Amerykanów nie stać na leczenie. Jak naprawić system opieki zdrowotnej?', 'Czy Obamacare powinna zostać utrzymana, zreformowana, czy uchylona?'],
  security: ['Wskaźniki przestępczości w wielu miastach budzą niepokój. Jak zapewni Pan/Pani bezpieczeństwo?', 'Jak zapobiegać masowym strzelaninom, szanując Drugą Poprawkę?'],
  foreign: ['Jak powinna wyglądać polityka USA wobec Chin?', 'Czy Ameryka powinna dalej finansować sojuszników w konfliktach zbrojnych?'],
  climate: ['Czy zmiany klimatu to zagrożenie egzystencjalne, a jeśli tak — ile jest Pan/Pani gotów/gotowa za to zapłacić?', 'Jak zapewnić tanią energię, nie niszcząc planety?'],
  social: ['Spory światopoglądowe dzielą kraj. Jak zamierza Pan/Pani być prezydentem wszystkich Amerykanów?', 'Czy decyzje w sprawach sumienia powinny należeć do stanów, czy do Waszyngtonu?'],
  education: ['Dług studencki przekroczył 1,7 biliona dolarów. Co z tym zrobić?', 'Kto powinien decydować o tym, czego uczą się dzieci w szkołach?'],
};

export const APPROACH_META: Record<DebateApproach, { label: string; icon: string; desc: string; beats: DebateApproach }> = {
  facts: { label: 'Fakty i konkrety', icon: '📊', desc: 'Liczby, plany, doświadczenie. Bezpieczne i stabilne. Silne przeciw atakom.', beats: 'attack' },
  attack: { label: 'Atak na rywala', icon: '⚔️', desc: 'Punktuj słabości przeciwnika. Duża zmienność. Skuteczne przeciw unikom.', beats: 'pivot' },
  empathy: { label: 'Emocje i empatia', icon: '❤️', desc: 'Historie zwykłych ludzi. Bazuje na charyzmie i wiarygodności. Ożywia suche wywody.', beats: 'facts' },
  pivot: { label: 'Unik i zmiana tematu', icon: '↪️', desc: 'Przekieruj rozmowę na swój mocny temat. Dobre, gdy temat Ci nie sprzyja. Neutralizuje emocje.', beats: 'empathy' },
};

export const ROUND_COMMENTARY: Record<DebateApproach, { good: string[]; bad: string[] }> = {
  facts: {
    good: ['{name} sypie liczbami jak z rękawa — widać przygotowanie.', '{name} przedstawia konkretny, przekonujący plan.'],
    bad: ['{name} gubi się w szczegółach — widzowie ziewają.', '{name} myli dane, co natychmiast wychwytują fact-checkerzy.'],
  },
  attack: {
    good: ['{name} zadaje celny cios — publiczność reaguje głośno.', 'Ostra riposta {name} na pewno trafi do memów.'],
    bad: ['Atak {name} wypada agresywnie i małostkowo.', '{name} przesadza — nawet życzliwi komentatorzy krzywią się.'],
  },
  empathy: {
    good: ['{name} opowiada wzruszającą historię wyborczyni z Michigan.', '{name} brzmi autentycznie — wskaźnik w grupie fokusowej szybuje.'],
    bad: ['Emocjonalny apel {name} brzmi sztucznie i wyuczenie.', '{name} unika konkretów, chowając się za anegdotami.'],
  },
  pivot: {
    good: ['{name} zręcznie przekierowuje rozmowę na swój najmocniejszy temat.', 'Gładka zmiana tematu przez {name} — moderator nie zdążył zareagować.'],
    bad: ['Moderator przyłapuje {name} na unikaniu pytania.', '{name} wyraźnie ucieka od odpowiedzi — widzowie to zauważają.'],
  },
};
