import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../store/gameStore';
import { USMap } from '../map/USMap';
import { STATES } from '../../data/states';
import { marginFill } from '../colors';
import { HelpModal } from '../modals/HelpModal';

function randomFills(seed: number) {
  const fills: Record<string, string> = {};
  for (const s of STATES) {
    const noise = Math.sin(seed * 12.9898 + s.ev * 78.233 + s.fips.charCodeAt(1)) * 0.08;
    const m = s.lean + noise;
    fills[s.code] = marginFill(m > 0 ? '#ef4444' : '#3b82f6', m);
  }
  return fills;
}

export function MainMenu() {
  const { setScreen, hasSave, loadSave, toast } = useGame();
  const [tick, setTick] = useState(1);
  const [help, setHelp] = useState(false);
  const save = useMemo(() => hasSave(), [hasSave]);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(id);
  }, []);
  const fills = useMemo(() => randomFills(tick), [tick]);

  return (
    <div className="menu-screen">
      <div className="menu-map">
        <USMap fills={fills} showLabels={false} />
      </div>
      <div className="menu-content">
        <div className="menu-kicker display">Wybory prezydenckie USA · 2028</div>
        <h1 className="menu-title display">
          Road to <span>270</span>
        </h1>
        <p className="menu-sub">
          Stwórz własnych kandydatów, poprowadź kampanię przez 50 stanów, wygrywaj debaty, reaguj na kryzysy i zdobądź większość w Kolegium Elektorów.
        </p>
        <div className="col" style={{ gap: 10, width: 300 }}>
          <button className="btn primary lg block" onClick={() => setScreen('setup')}>
            ★ Nowa kampania
          </button>
          <button
            className="btn lg block"
            disabled={!save}
            onClick={() => {
              if (!loadSave()) toast('Nie udało się wczytać zapisu', 'err');
            }}
          >
            Kontynuuj zapisaną grę
          </button>
          <button className="btn lg block" onClick={() => setHelp(true)}>
            Jak grać?
          </button>
        </div>
        <div className="menu-features">
          {[
            ['🗺️', '50 stanów + DC', 'Kolegium Elektorów, swing states, podział głosów w Maine i Nebrasce'],
            ['📊', 'Sondaże i prognoza', 'Pracownie z „house effects” i model Monte Carlo szans na wygraną'],
            ['🎙️', 'Debaty i wiece', 'Mini-gra debat, harmonogram kandydata, reklamy i biura terenowe'],
            ['⚡', 'Wydarzenia', 'Skandale, huragany, kryzysy, October Surprise i decyzje pod presją'],
          ].map(([icon, t, d]) => (
            <div key={t} className="feature">
              <div className="feature-icon">{icon}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{t}</div>
                <div className="tiny muted">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {help && <HelpModal onClose={() => setHelp(false)} />}
    </div>
  );
}
