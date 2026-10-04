import { useGame } from '../../store/gameStore';
import { dayLabel } from '../selectors';
import { Modal } from '../components/common';

const TONE_ICON = { good: '▲', bad: '▼', neutral: '●', breaking: '◆' } as const;

export function Ticker() {
  const game = useGame((s) => s.game)!;
  const toggleLog = useGame((s) => s.toggleLog);
  const items = game.news.slice(0, 12);
  const loop = [...items, ...items];
  const latest = game.news[0];
  return (
    <footer className="ticker" onClick={() => toggleLog(true)} title="Kliknij, aby otworzyć dziennik">
      <div className="ticker-label display">{latest?.tone === 'breaking' && latest.day === game.day ? 'PILNE' : 'WIADOMOŚCI'}</div>
      <div className="ticker-viewport">
        <div className="ticker-track" style={{ animationDuration: `${Math.max(40, items.length * 9)}s` }}>
          {loop.map((n, i) => (
            <span key={`${n.id}-${i}`} className={`ticker-item ${n.tone}`}>
              <span className="ticker-icon">{TONE_ICON[n.tone]}</span>
              <span className="tiny muted">{dayLabel(game, n.day)}</span> {n.headline}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}

export function NewsLog() {
  const game = useGame((s) => s.game)!;
  const toggleLog = useGame((s) => s.toggleLog);
  return (
    <Modal wide onClose={() => toggleLog(false)}>
      <div className="modal-head spread">
        <h2 className="display" style={{ fontSize: 24 }}>
          Dziennik kampanii
        </h2>
        <button className="btn sm" onClick={() => toggleLog(false)}>
          Zamknij
        </button>
      </div>
      <div className="modal-body col" style={{ gap: 8 }}>
        {game.news.map((n) => {
          const c = game.candidates.find((x) => x.id === n.candId);
          return (
            <div key={n.id} className={`log-item ${n.tone}`} style={{ borderLeftColor: c?.color }}>
              <div className="spread tiny muted">
                <span>{dayLabel(game, n.day, true)}</span>
                <span>{n.category}</span>
              </div>
              <div style={{ fontWeight: 600 }}>{n.headline}</div>
              {n.body && <div className="small text-2">{n.body}</div>}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
