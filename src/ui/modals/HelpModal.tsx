import { Modal } from '../components/common';

const SECTIONS: [string, string][] = [
  ['Cel gry', 'Zdobądź co najmniej 270 z 538 głosów elektorskich. Wygrywasz stan — zgarniasz wszystkie jego głosy (poza Maine i Nebraską, które dzielą głosy według okręgów). Jeśli nikt nie przekroczy 270, prezydenta wybiera Izba Reprezentantów.'],
  ['Czas', 'Kampania płynie w czasie rzeczywistym. Spacja = pauza, klawisze 1–3 = prędkość. Gra sama się zatrzymuje, gdy musisz podjąć decyzję lub stanąć do debaty.'],
  ['Harmonogram kandydata', 'Każdego dnia kandydat wykonuje jedną zaplanowaną aktywność: wiec, spotkanie z wyborcami, zbiórkę funduszy, przemówienie, wywiad, przygotowanie do debaty albo odpoczynek. Zaplanuj do 7 dni naprzód. Pilnuj kondycji — zmęczony kandydat jest mniej skuteczny i częściej popełnia gafy.'],
  ['Działania w stanach', 'Kliknij stan na mapie: wiece, spotkania, zbiórki, reklamy TV, kampania internetowa, door-to-door i biura terenowe. Reklamy i teren kosztują pieniądze, ale nie czas kandydata. Biura działają do końca kampanii i zwiększają mobilizację. Efekty słabną z czasem — trzeba je odnawiać.'],
  ['Sondaże i prognoza', 'Widzisz to, co pokazują sondaże — a sondaże mogą się mylić! Rzeczywiste poparcie poznasz dopiero w wieczór wyborczy. Prognoza pokazuje szanse na zwycięstwo na podstawie tysięcy symulacji.'],
  ['Tematy kampanii', 'Wyborcy oceniają, jak blisko są Twoje poglądy ich oczekiwań w tematach, które są akurat ważne. Przemówienia i wydarzenia zmieniają agendę mediów — mów o tym, w czym masz przewagę.'],
  ['Debaty', 'Do debaty kwalifikują się kandydaci z co najmniej 15% w sondażach. Przed debatą wybierasz strategię (atak, gospodarka, bezpieczeństwo, pozytywny przekaz, odpieranie ataków), potem w każdej rundzie styl odpowiedzi. Po debacie dostajesz oceny, reakcje mediów i zmianę poparcia.'],
  ['Głosowanie przedterminowe', 'Na 4 tygodnie przed wyborami ruszają głosowanie korespondencyjne i wcześniejsze. Oddanych głosów nie da się już odzyskać — liczy się dobra pozycja przez cały finisz kampanii.'],
  ['Gospodarka', 'PKB, inflacja, bezrobocie, stopy Fed, giełda i ceny paliw wpływają na ocenę administracji (aprobatę prezydenta), a ta na kandydata partii rządzącej.'],
  ['Grupy wyborców', 'Każdy stan to mieszanka grup: młodzi, seniorzy, miasta, przedmieścia, wieś, absolwenci, różne dochody i niezależni. Każda grupa ma inne priorytety, inaczej reaguje na TV, internet i wiece — i inaczej chodzi na wybory.'],
  ['Pieniądze', 'Wpływy płyną od drobnych darczyńców (buzz, momentum), dużych darczyńców (szanse wygranej), PAC-ów i partii. Wydajesz na TV, internet, door-to-door, biura, podróże i sztab. Każdy kolejny milion daje mniej — rynek się nasyca.'],
  ['Social media', 'Obserwujący, zaangażowanie, buzz i potencjał viralowy. Wybierz strategię zespołu cyfrowego w zakładce Media. Viral może pomóc — albo zaszkodzić. Najmocniej działa na młodych.'],
  ['Oś czasu', 'Start → prawybory (wybór wiceprezydenta) → konwencje (convention bounce) → kampania → debaty → ostatnie tygodnie → Election Day → Election Night.'],
];

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} wide>
      <div className="modal-head">
        <h2 className="display" style={{ fontSize: 26 }}>
          Jak grać
        </h2>
      </div>
      <div className="modal-body help-grid">
        {SECTIONS.map(([t, d]) => (
          <div key={t} className="help-card">
            <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--accent)' }}>{t}</div>
            <div className="small text-2">{d}</div>
          </div>
        ))}
      </div>
      <div className="modal-foot">
        <button className="btn primary" onClick={onClose}>
          Rozumiem
        </button>
      </div>
    </Modal>
  );
}
