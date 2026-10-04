import { useGame, usePlayer, type Speed } from '../../store/gameStore';
import { dayLabel } from '../selectors';
import { bankedTotal } from '../../engine/election';
import { fmtMoney } from '../../engine/util';
import { TUNING } from '../../engine/config';
import { phaseOf } from '../../engine/timeline';
import { LangSwitch } from '../components/LangSwitch';
import { useT } from '../../i18n/useT';

const SPEEDS: { s: Speed; label: string }[] = [
  { s: 0, label: '❚❚' },
  { s: 1, label: '▶' },
  { s: 2, label: '▶▶' },
  { s: 3, label: '▶▶▶' },
];

export function TopBar() {
  const game = useGame((s) => s.game)!;
  const speed = useGame((s) => s.speed);
  const { setSpeed, toggleLog, toggleHelp, save, quitToMenu } = useGame();
  const player = usePlayer();
  const { t, loc, lang } = useT();
  const phase = phaseOf(game);
  const daysLeft = game.settings.totalDays - game.day;
  const blocked = !!game.pendingEvent || !!game.liveDebate;
  const banked = bankedTotal(game);
  const progress = game.day / game.settings.totalDays;

  return (
    <header className="topbar">
      <div className="brand display">
        <span className="brand-mark">★</span> Road to <b>270</b>
      </div>
      <div className="topbar-date">
        <div className="display date-main">{dayLabel(game, game.day, true, lang)}</div>
        <div className="tiny muted">
          {t('Dzień', 'Day')} {game.day} {t('z', 'of')} {game.settings.totalDays}
        </div>
      </div>
      <div className="countdown">
        <div className="display countdown-num">{daysLeft}</div>
        <div className="tiny muted">
          {t('dni do', 'days to')}
          <br />
          {t('wyborów', 'election')}
        </div>
      </div>
      <div className="phase-chip" title={loc(phase.desc)}>
        <div className="tiny muted">{t('Faza', 'Phase')}</div>
        <b className="small">{loc(phase.short)}</b>
      </div>
      <div className="speed-ctrl">
        {SPEEDS.map(({ s, label }) => (
          <button key={s} className={`speed-btn${speed === s ? ' on' : ''}`} disabled={blocked && s > 0} onClick={() => setSpeed(s)} title={s === 0 ? t('Pauza (spacja)', 'Pause (space)') : t(`Prędkość ${s} (klawisz ${s})`, `Speed ${s} (key ${s})`)}>
            {label}
          </button>
        ))}
        <div className="speed-progress">
          <div style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      {blocked && <div className="chip" style={{ color: 'var(--accent)', borderColor: 'var(--accent)', animation: 'pulse 1.4s infinite' }}>{t('Czeka na Twoją decyzję', 'Awaiting your decision')}</div>}
      <div className="grow" />
      {daysLeft < TUNING.earlyVotingDays && (
        <div className="topbar-stat">
          <div className="tiny muted">{t('Głosy oddane wcześniej', 'Early votes cast')}</div>
          <div className="display stat-val">{banked.toFixed(1)} {t('mln', 'M')}</div>
        </div>
      )}
      {player && (
        <>
          <div className="topbar-stat">
            <div className="tiny muted">{t('Fundusze kampanii', 'Campaign funds')}</div>
            <div className="display stat-val" style={{ color: player.funds < 3 ? 'var(--bad)' : 'var(--good)' }}>
              {fmtMoney(player.funds, lang)}
            </div>
          </div>
          <div className="topbar-stat" style={{ width: 120 }}>
            <div className="spread tiny">
              <span className="muted">{t('Kondycja', 'Stamina')}</span>
              <span className="mono">{Math.round(player.stamina)}</span>
            </div>
            <div className="bar" style={{ marginTop: 5 }}>
              <div style={{ width: `${player.stamina}%`, background: player.stamina < 30 ? 'var(--bad)' : player.stamina < 60 ? 'var(--warn)' : 'var(--good)' }} />
            </div>
          </div>
        </>
      )}
      <div className="row" style={{ gap: 4 }}>
        <LangSwitch compact />
        <button className="btn sm ghost" onClick={() => toggleLog(true)} title={t('Dziennik wydarzeń', 'Event log')}>
          📰
        </button>
        <button className="btn sm ghost" onClick={() => toggleHelp(true)} title={t('Pomoc', 'Help')}>
          ?
        </button>
        <button className="btn sm ghost" onClick={save} title={t('Zapisz grę', 'Save game')}>
          💾
        </button>
        <button className="btn sm ghost" onClick={quitToMenu} title={t('Wyjdź do menu', 'Quit to menu')}>
          ⏏
        </button>
      </div>
    </header>
  );
}
