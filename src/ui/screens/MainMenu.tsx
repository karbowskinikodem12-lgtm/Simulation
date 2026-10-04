import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../store/gameStore';
import { USMap } from '../map/USMap';
import { STATES } from '../../data/states';
import { marginFill } from '../colors';
import { HelpModal } from '../modals/HelpModal';
import { LangSwitch } from '../components/LangSwitch';
import { L } from '../../i18n';
import { useT } from '../../i18n/useT';

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
  const { t } = useT();
  const [tick, setTick] = useState(1);
  const [help, setHelp] = useState(false);
  const save = useMemo(() => hasSave(), [hasSave]);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(id);
  }, []);
  const fills = useMemo(() => randomFills(tick), [tick]);

  const features: [string, string, string][] = [
    ['🗺️', t('50 stanów + DC', '50 states + DC'), t('Kolegium Elektorów, stany wahające się, podział głosów w Maine i Nebrasce', 'Electoral College, swing states, split electoral votes in Maine and Nebraska')],
    ['📊', t('Sondaże i prognoza', 'Polls & forecast'), t('Pracownie z efektem domu i model Monte Carlo szans na wygraną', 'Pollsters with house effects and a Monte Carlo model of win chances')],
    ['🎙️', t('Debaty i wiece', 'Debates & rallies'), t('Mini-gra debat, harmonogram kandydata, reklamy i biura terenowe', 'Debate mini-game, candidate schedule, ads and field offices')],
    ['⚡', t('Wydarzenia', 'Events'), t('Skandale, huragany, kryzysy, październikowa niespodzianka i decyzje pod presją', 'Scandals, hurricanes, crises, the October Surprise and decisions under pressure')],
  ];

  return (
    <div className="menu-screen">
      <div className="menu-map">
        <USMap fills={fills} showLabels={false} />
      </div>
      <div className="menu-lang">
        <LangSwitch />
      </div>
      <div className="menu-content">
        <div className="menu-kicker display">{t('Wybory prezydenckie USA · 2028', 'U.S. Presidential Election · 2028')}</div>
        <h1 className="menu-title display">
          Road to <span>270</span>
        </h1>
        <p className="menu-sub">
          {t(
            'Stwórz własnych kandydatów, poprowadź kampanię przez 50 stanów, wygrywaj debaty, reaguj na kryzysy i zdobądź większość w Kolegium Elektorów.',
            'Create your own candidates, campaign across all 50 states, win debates, handle crises and secure a majority in the Electoral College.',
          )}
        </p>
        <div className="col" style={{ gap: 10, width: 300 }}>
          <button className="btn primary lg block" onClick={() => setScreen('setup')}>
            ★ {t('Nowa kampania', 'New campaign')}
          </button>
          <button
            className="btn lg block"
            disabled={!save}
            onClick={() => {
              if (!loadSave()) toast(L('Nie udało się wczytać zapisu', 'Could not load the save'), 'err');
            }}
          >
            {t('Kontynuuj zapisaną grę', 'Continue saved game')}
          </button>
          <button className="btn lg block" onClick={() => setHelp(true)}>
            {t('Jak grać?', 'How to play?')}
          </button>
        </div>
        <div className="menu-features">
          {features.map(([icon, title, d]) => (
            <div key={icon} className="feature">
              <div className="feature-icon">{icon}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{title}</div>
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
