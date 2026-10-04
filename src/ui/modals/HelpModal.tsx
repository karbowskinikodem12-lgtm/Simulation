import { Modal } from '../components/common';
import { L, type LStr } from '../../i18n';
import { useT } from '../../i18n/useT';

const SECTIONS: [LStr, LStr][] = [
  [
    L('Cel gry', 'Goal'),
    L(
      'Zdobądź co najmniej 270 z 538 głosów elektorskich. Wygrywasz stan — zgarniasz wszystkie jego głosy (poza Maine i Nebraską, które dzielą głosy według okręgów). Jeśli nikt nie przekroczy 270, prezydenta wybiera Izba Reprezentantów.',
      'Win at least 270 of the 538 electoral votes. Carry a state and you take all of its electors (except Maine and Nebraska, which split them by congressional district). If nobody reaches 270, the House of Representatives picks the president.',
    ),
  ],
  [
    L('Czas', 'Time'),
    L(
      'Kampania płynie w czasie rzeczywistym. Spacja = pauza, klawisze 1–3 = prędkość. Gra sama się zatrzymuje, gdy musisz podjąć decyzję lub stanąć do debaty.',
      'The campaign runs in real time. Space = pause, keys 1–3 = speed. The game pauses by itself whenever you must make a decision or take the debate stage.',
    ),
  ],
  [
    L('Harmonogram kandydata', 'Candidate schedule'),
    L(
      'Każdego dnia kandydat wykonuje jedną zaplanowaną aktywność: wiec, spotkanie z wyborcami, zbiórkę funduszy, przemówienie, wywiad, przygotowanie do debaty albo odpoczynek. Zaplanuj do 7 dni naprzód. Pilnuj kondycji — zmęczony kandydat jest mniej skuteczny i częściej popełnia gafy.',
      'Each day the candidate performs one scheduled activity: a rally, a town hall, a fundraiser, a speech, an interview, debate prep or rest. Plan up to 7 days ahead. Watch stamina — a tired candidate is less effective and more gaffe-prone.',
    ),
  ],
  [
    L('Działania w stanach', 'State operations'),
    L(
      'Kliknij stan na mapie: wiece, spotkania, zbiórki, reklamy TV, kampania internetowa, agitacja od drzwi do drzwi i biura terenowe. Reklamy i teren kosztują pieniądze, ale nie czas kandydata. Biura działają do końca kampanii i zwiększają mobilizację. Efekty słabną z czasem — trzeba je odnawiać.',
      'Click a state on the map: rallies, town halls, fundraisers, TV ads, digital campaigns, door-to-door canvassing and field offices. Ads and ground game cost money but not candidate time. Offices last until the end of the campaign and boost turnout. Effects fade over time — keep renewing them.',
    ),
  ],
  [
    L('Sondaże i prognoza', 'Polls & forecast'),
    L(
      'Widzisz to, co pokazują sondaże — a sondaże mogą się mylić! Rzeczywiste poparcie poznasz dopiero w wieczór wyborczy. Prognoza pokazuje szanse na zwycięstwo na podstawie tysięcy symulacji.',
      'You see what the polls show — and polls can be wrong! True support is revealed only on Election Night. The forecast shows win chances based on thousands of simulations.',
    ),
  ],
  [
    L('Tematy kampanii', 'Campaign issues'),
    L(
      'Wyborcy oceniają, jak blisko są Twoje poglądy ich oczekiwań w tematach, które są akurat ważne. Przemówienia i wydarzenia zmieniają agendę mediów — mów o tym, w czym masz przewagę.',
      'Voters judge how close your positions are to theirs on the issues that matter right now. Speeches and events shift the media agenda — talk about what plays to your strengths.',
    ),
  ],
  [
    L('Debaty', 'Debates'),
    L(
      'Do debaty kwalifikują się kandydaci z co najmniej 15% w sondażach. Przed debatą wybierasz strategię (atak, gospodarka, bezpieczeństwo, pozytywny przekaz, odpieranie ataków), potem w każdej rundzie styl odpowiedzi. Po debacie dostajesz oceny, reakcje mediów i zmianę poparcia.',
      'Candidates polling at 15% or more qualify for debates. Before a debate you pick a strategy (attack, economy, security, positive message, defense), then an answer style in each round. Afterwards you get grades, media reactions and the shift in support.',
    ),
  ],
  [
    L('Głosowanie przedterminowe', 'Early voting'),
    L(
      'Na 4 tygodnie przed wyborami ruszają głosowanie korespondencyjne i wcześniejsze. Oddanych głosów nie da się już odzyskać — liczy się dobra pozycja przez cały finisz kampanii.',
      'Four weeks before the election, mail-in and early voting begin. Banked votes cannot be won back — what matters is staying strong through the whole home stretch.',
    ),
  ],
  [
    L('Gospodarka', 'Economy'),
    L(
      'PKB, inflacja, bezrobocie, stopy Fed, giełda i ceny paliw wpływają na ocenę administracji (aprobatę prezydenta), a ta na kandydata partii rządzącej.',
      'GDP, inflation, unemployment, Fed rates, the stock market and gas prices drive presidential approval, which in turn affects the governing party’s candidate.',
    ),
  ],
  [
    L('Grupy wyborców', 'Voter groups'),
    L(
      'Każdy stan to mieszanka grup: młodzi, seniorzy, miasta, przedmieścia, wieś, absolwenci, różne dochody i niezależni. Każda grupa ma inne priorytety, inaczej reaguje na TV, internet i wiece — i inaczej chodzi na wybory.',
      'Every state is a mix of groups: young voters, seniors, urban, suburban and rural voters, college graduates, income brackets and independents. Each has its own priorities, reacts differently to TV, digital and rallies — and turns out differently.',
    ),
  ],
  [
    L('Pieniądze', 'Money'),
    L(
      'Wpływy płyną od drobnych darczyńców (rozgłos, impet), dużych darczyńców (szanse wygranej), komitetów PAC i partii. Wydajesz na TV, internet, agitację od drzwi do drzwi, biura, podróże i sztab. Każdy kolejny milion daje mniej — rynek się nasyca.',
      'Money comes from small donors (buzz, momentum), big donors (win chances), PACs and the party. You spend on TV, digital, door-to-door, offices, travel and staff. Every extra million buys less — markets saturate.',
    ),
  ],
  [
    L('Media społecznościowe', 'Social media'),
    L(
      'Obserwujący, zaangażowanie, rozgłos i potencjał wiralowy. Wybierz strategię zespołu cyfrowego w zakładce Media. Wiral może pomóc — albo zaszkodzić. Najmocniej działa na młodych.',
      'Followers, engagement, buzz and viral potential. Pick your digital team’s strategy in the Media tab. Going viral can help — or hurt. It matters most with young voters.',
    ),
  ],
  [
    L('Oś czasu', 'Timeline'),
    L(
      'Start → prawybory (wybór wiceprezydenta) → konwencje (premia pokonwencyjna) → kampania → debaty → ostatnie tygodnie → Dzień wyborów → Wieczór wyborczy.',
      'Launch → primaries (VP pick) → conventions (convention bounce) → general campaign → debates → final weeks → Election Day → Election Night.',
    ),
  ],
];

export function HelpModal({ onClose }: { onClose: () => void }) {
  const { t, loc } = useT();
  return (
    <Modal onClose={onClose} wide>
      <div className="modal-head">
        <h2 className="display" style={{ fontSize: 26 }}>
          {t('Jak grać', 'How to play')}
        </h2>
      </div>
      <div className="modal-body help-grid">
        {SECTIONS.map(([title, d]) => (
          <div key={title.en} className="help-card">
            <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--accent)' }}>{loc(title)}</div>
            <div className="small text-2">{loc(d)}</div>
          </div>
        ))}
      </div>
      <div className="modal-foot">
        <button className="btn primary" onClick={onClose}>
          {t('Rozumiem', 'Got it')}
        </button>
      </div>
    </Modal>
  );
}
