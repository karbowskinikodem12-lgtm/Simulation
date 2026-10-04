import { useGame } from '../../store/gameStore';
import { dayLabel } from '../selectors';
import { Modal } from '../components/common';
import { L, type LStr } from '../../i18n';
import { useT } from '../../i18n/useT';

const CATEGORY_LABEL: Record<string, LStr> = {
  ads: L('reklamy', 'ads'),
  campaign: L('kampania', 'campaign'),
  crisis: L('kryzys', 'crisis'),
  debate: L('debata', 'debate'),
  disaster: L('katastrofa', 'disaster'),
  economy: L('gospodarka', 'economy'),
  endorsement: L('poparcie', 'endorsement'),
  event: L('wydarzenie', 'event'),
  gaffe: L('gafa', 'gaffe'),
  ground: L('teren', 'ground game'),
  media: L('media', 'media'),
  money: L('finanse', 'money'),
  opportunity: L('okazja', 'opportunity'),
  polls: L('sondaże', 'polls'),
  rally: L('wiec', 'rally'),
  scandal: L('skandal', 'scandal'),
  social: L('media społecznościowe', 'social media'),
  speech: L('przemówienie', 'speech'),
  world: L('świat', 'world'),
};

const TONE_ICON = { good: '▲', bad: '▼', neutral: '●', breaking: '◆' } as const;

export function Ticker() {
  const game = useGame((s) => s.game)!;
  const toggleLog = useGame((s) => s.toggleLog);
  const items = game.news.slice(0, 12);
  const loop = [...items, ...items];
  const latest = game.news[0];
  const { t, loc, lang } = useT();
  return (
    <footer className="ticker" onClick={() => toggleLog(true)} title={t('Kliknij, aby otworzyć dziennik', 'Click to open the log')}>
      <div className="ticker-label display">{latest?.tone === 'breaking' && latest.day === game.day ? t('PILNE', 'BREAKING') : t('WIADOMOŚCI', 'NEWS')}</div>
      <div className="ticker-viewport">
        <div className="ticker-track" style={{ animationDuration: `${Math.max(40, items.length * 9)}s` }}>
          {loop.map((n, i) => (
            <span key={`${n.id}-${i}`} className={`ticker-item ${n.tone}`}>
              <span className="ticker-icon">{TONE_ICON[n.tone]}</span>
              <span className="tiny muted">{dayLabel(game, n.day, false, lang)}</span> {loc(n.headline)}
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
  const { t, loc, lang } = useT();
  return (
    <Modal wide onClose={() => toggleLog(false)}>
      <div className="modal-head spread">
        <h2 className="display" style={{ fontSize: 24 }}>
          {t('Dziennik kampanii', 'Campaign log')}
        </h2>
        <button className="btn sm" onClick={() => toggleLog(false)}>
          {t('Zamknij', 'Close')}
        </button>
      </div>
      <div className="modal-body col" style={{ gap: 8 }}>
        {game.news.map((n) => {
          const c = game.candidates.find((x) => x.id === n.candId);
          return (
            <div key={n.id} className={`log-item ${n.tone}`} style={{ borderLeftColor: c?.color }}>
              <div className="spread tiny muted">
                <span>{dayLabel(game, n.day, true, lang)}</span>
                <span>{CATEGORY_LABEL[n.category] ? loc(CATEGORY_LABEL[n.category]) : n.category}</span>
              </div>
              <div style={{ fontWeight: 600 }}>{loc(n.headline)}</div>
              {n.body && <div className="small text-2">{loc(n.body)}</div>}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
