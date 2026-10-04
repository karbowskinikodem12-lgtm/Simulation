import { useGame } from '../../store/gameStore';
import { TEMPLATE_BY_ID } from '../../engine/events';
import { fill } from '../../engine/effects';
import { Modal } from '../components/common';
import { L, type LStr } from '../../i18n';
import { useT } from '../../i18n/useT';

const CATEGORY_LABEL: Record<string, LStr> = {
  economy: L('Gospodarka', 'Economy'),
  scandal: L('Skandal', 'Scandal'),
  crisis: L('Kryzys', 'Crisis'),
  endorsement: L('Poparcie', 'Endorsement'),
  opportunity: L('Okazja', 'Opportunity'),
  disaster: L('Katastrofa', 'Disaster'),
  world: L('Świat', 'World'),
  media: L('Media', 'Media'),
};

export function EventModal() {
  const game = useGame((s) => s.game)!;
  const chooseEvent = useGame((s) => s.chooseEvent);
  const { t: tr, loc } = useT();
  const pe = game.pendingEvent;
  if (!pe) return null;
  const t = TEMPLATE_BY_ID[pe.templateId];
  const breaking = t.tone === 'breaking' || t.tone === 'bad';
  return (
    <Modal>
      <div className={`event-banner ${breaking ? 'breaking' : ''}`}>
        <span className="display">{t.tone === 'breaking' ? tr('PILNE', 'BREAKING') : loc(CATEGORY_LABEL[t.category]) || t.category}</span>
        <span className="tiny">{tr('Decyzja sztabu', 'Campaign decision')}</span>
      </div>
      <div className="modal-head row" style={{ gap: 14, alignItems: 'flex-start' }}>
        <div className="event-icon">{t.icon}</div>
        <div>
          <h2 style={{ fontSize: 21, lineHeight: 1.25 }}>{loc(fill(t.title, game, pe.ctx))}</h2>
          <p className="text-2" style={{ margin: '8px 0 0' }}>
            {loc(fill(t.text, game, pe.ctx))}
          </p>
        </div>
      </div>
      <div className="modal-body col" style={{ gap: 10 }}>
        <div className="panel-title">{tr('Jak reagujesz?', 'How do you respond?')}</div>
        {t.choices!.map((ch, i) => (
          <button key={i} className="choice-btn" onClick={() => chooseEvent(i)}>
            <span className="choice-num display">{i + 1}</span>
            <span className="grow">
              <span style={{ fontWeight: 700, display: 'block' }}>{loc(fill(ch.label, game, pe.ctx))}</span>
              <span className="small muted">{loc(fill(ch.hint, game, pe.ctx))}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
