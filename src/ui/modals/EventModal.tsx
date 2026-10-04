import { useGame } from '../../store/gameStore';
import { TEMPLATE_BY_ID } from '../../engine/events';
import { fill } from '../../engine/effects';
import { Modal } from '../components/common';

const CATEGORY_LABEL: Record<string, string> = {
  economy: 'Gospodarka',
  scandal: 'Skandal',
  crisis: 'Kryzys',
  endorsement: 'Poparcie',
  opportunity: 'Okazja',
  disaster: 'Katastrofa',
  world: 'Świat',
  media: 'Media',
};

export function EventModal() {
  const game = useGame((s) => s.game)!;
  const chooseEvent = useGame((s) => s.chooseEvent);
  const pe = game.pendingEvent;
  if (!pe) return null;
  const t = TEMPLATE_BY_ID[pe.templateId];
  const breaking = t.tone === 'breaking' || t.tone === 'bad';
  return (
    <Modal>
      <div className={`event-banner ${breaking ? 'breaking' : ''}`}>
        <span className="display">{t.tone === 'breaking' ? 'PILNE' : CATEGORY_LABEL[t.category]}</span>
        <span className="tiny">Decyzja sztabu</span>
      </div>
      <div className="modal-head row" style={{ gap: 14, alignItems: 'flex-start' }}>
        <div className="event-icon">{t.icon}</div>
        <div>
          <h2 style={{ fontSize: 21, lineHeight: 1.25 }}>{fill(t.title, game, pe.ctx)}</h2>
          <p className="text-2" style={{ margin: '8px 0 0' }}>
            {fill(t.text, game, pe.ctx)}
          </p>
        </div>
      </div>
      <div className="modal-body col" style={{ gap: 10 }}>
        <div className="panel-title">Jak reagujesz?</div>
        {t.choices!.map((ch, i) => (
          <button key={i} className="choice-btn" onClick={() => chooseEvent(i)}>
            <span className="choice-num display">{i + 1}</span>
            <span className="grow">
              <span style={{ fontWeight: 700, display: 'block' }}>{fill(ch.label, game, pe.ctx)}</span>
              <span className="small muted">{fill(ch.hint, game, pe.ctx)}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
