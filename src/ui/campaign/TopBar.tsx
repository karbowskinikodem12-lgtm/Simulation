import { useGame, usePlayer, type Speed } from '../../store/gameStore';
import { dayLabel } from '../selectors';
import { bankedTotal } from '../../engine/election';
import { fmtMoney } from '../../engine/util';
import { TUNING } from '../../engine/config';
import { phaseOf } from '../../engine/timeline';

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
        <div className="display date-main">{dayLabel(game, game.day, true)}</div>
        <div className="tiny muted">
          Dzień {game.day} z {game.settings.totalDays}
        </div>
      </div>
      <div className="countdown">
        <div className="display countdown-num">{daysLeft}</div>
        <div className="tiny muted">
          dni do
          <br />
          wyborów
        </div>
      </div>
      <div className="phase-chip" title={phaseOf(game).desc}>
        <div className="tiny muted">Faza</div>
        <b className="small">{phaseOf(game).short}</b>
      </div>
      <div className="speed-ctrl">
        {SPEEDS.map(({ s, label }) => (
          <button key={s} className={`speed-btn${speed === s ? ' on' : ''}`} disabled={blocked && s > 0} onClick={() => setSpeed(s)} title={s === 0 ? 'Pauza (spacja)' : `Prędkość ${s} (klawisz ${s})`}>
            {label}
          </button>
        ))}
        <div className="speed-progress">
          <div style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      {blocked && <div className="chip" style={{ color: 'var(--accent)', borderColor: 'var(--accent)', animation: 'pulse 1.4s infinite' }}>Czeka na Twoją decyzję</div>}
      <div className="grow" />
      {daysLeft < TUNING.earlyVotingDays && (
        <div className="topbar-stat">
          <div className="tiny muted">Głosy oddane wcześniej</div>
          <div className="display stat-val">{banked.toFixed(1)} mln</div>
        </div>
      )}
      {player && (
        <>
          <div className="topbar-stat">
            <div className="tiny muted">Fundusze kampanii</div>
            <div className="display stat-val" style={{ color: player.funds < 3 ? 'var(--bad)' : 'var(--good)' }}>
              {fmtMoney(player.funds)}
            </div>
          </div>
          <div className="topbar-stat" style={{ width: 120 }}>
            <div className="spread tiny">
              <span className="muted">Kondycja</span>
              <span className="mono">{Math.round(player.stamina)}</span>
            </div>
            <div className="bar" style={{ marginTop: 5 }}>
              <div style={{ width: `${player.stamina}%`, background: player.stamina < 30 ? 'var(--bad)' : player.stamina < 60 ? 'var(--warn)' : 'var(--good)' }} />
            </div>
          </div>
        </>
      )}
      <div className="row" style={{ gap: 4 }}>
        <button className="btn sm ghost" onClick={() => toggleLog(true)} title="Dziennik wydarzeń">
          📰
        </button>
        <button className="btn sm ghost" onClick={() => toggleHelp(true)} title="Pomoc">
          ?
        </button>
        <button className="btn sm ghost" onClick={save} title="Zapisz grę">
          💾
        </button>
        <button className="btn sm ghost" onClick={quitToMenu} title="Wyjdź do menu">
          ⏏
        </button>
      </div>
    </header>
  );
}
