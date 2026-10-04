import type { Candidate } from '../../engine/types';
import { EV_TO_WIN, TOTAL_EV } from '../../data/states';
import { alpha } from '../colors';
import { useT } from '../../i18n/useT';

interface Props {
  candidates: Candidate[];
  ev: Record<string, number>;
  /** Optional "leaning" EV shown lighter next to solid EV. */
  lean?: Record<string, number>;
  height?: number;
  labels?: boolean;
}

/** Stacked electoral-vote bar: first candidate from the left, second from the right, others in between. */
export function EVBar({ candidates, ev, lean, height = 26, labels = true }: Props) {
  const [a, b, ...rest] = candidates;
  const { t } = useT();
  const pct = (v: number) => `${(v / TOTAL_EV) * 100}%`;
  const assigned = candidates.reduce((s, c) => s + (ev[c.id] ?? 0) + (lean?.[c.id] ?? 0), 0);
  const middle = TOTAL_EV - assigned;
  return (
    <div className="evbar">
      {labels && (
        <div className="spread" style={{ marginBottom: 6 }}>
          <div className="row">
            <span className="display" style={{ fontSize: 30, fontWeight: 800, color: a.color, lineHeight: 1 }}>
              {ev[a.id] ?? 0}
            </span>
            <span className="small text-2">{a.name}</span>
          </div>
          <div className="center tiny muted display" style={{ letterSpacing: '0.12em' }}>
            <span style={{ color: 'var(--accent)', fontSize: 15, fontWeight: 800 }}>{EV_TO_WIN} {t('DO ZWYCIĘSTWA', 'TO WIN')}</span>
            <br />
            {t('potrzeba do wygranej', 'needed to win')}
          </div>
          <div className="row">
            <span className="small text-2">{b.name}</span>
            <span className="display" style={{ fontSize: 30, fontWeight: 800, color: b.color, lineHeight: 1 }}>
              {ev[b.id] ?? 0}
            </span>
          </div>
        </div>
      )}
      <div style={{ position: 'relative', height, display: 'flex', borderRadius: 6, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ width: pct(ev[a.id] ?? 0), background: a.color, transition: 'width 0.6s ease' }} />
        {lean && <div style={{ width: pct(lean[a.id] ?? 0), background: alpha(a.color, 0.45), transition: 'width 0.6s ease' }} />}
        {rest.map((c) => (
          <div key={c.id} style={{ width: pct((ev[c.id] ?? 0) + (lean?.[c.id] ?? 0)), background: c.color, transition: 'width 0.6s ease' }} />
        ))}
        <div style={{ width: pct(Math.max(0, middle)) }} />
        {lean && <div style={{ width: pct(lean[b.id] ?? 0), background: alpha(b.color, 0.45), transition: 'width 0.6s ease' }} />}
        <div style={{ width: pct(ev[b.id] ?? 0), background: b.color, transition: 'width 0.6s ease' }} />
        <div style={{ position: 'absolute', left: '50%', top: -3, bottom: -3, width: 2, background: '#fff', boxShadow: '0 0 6px rgba(255,255,255,0.8)' }} />
      </div>
      {labels && rest.length > 0 && (
        <div className="row tiny" style={{ justifyContent: 'center', marginTop: 4, gap: 12 }}>
          {rest.map((c) => (
            <span key={c.id} style={{ color: c.color }}>
              {c.name}: <b>{ev[c.id] ?? 0}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
