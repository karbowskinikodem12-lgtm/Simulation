import { useGame } from '../../store/gameStore';
import { PARTIES } from '../../data/parties';
import { PROFILES, STAT_LABEL, TRAIT_META, VISIBLE_STATS, AI_STYLE_LABEL } from '../../data/profiles';
import { STATE_BY_CODE } from '../../data/states';
import { ISSUES, positionLabel } from '../../data/issues';
import { Avatar, Modal } from '../components/common';
import { SOCIAL_STRATEGY_META, viralPotential } from '../../engine/social';
import type { CandidateStats } from '../../engine/types';

/** Rivals' stats are only known roughly — campaigns never know each other's numbers. */
function fuzzy(v: number): string {
  if (v >= 80) return 'bardzo wysoka';
  if (v >= 65) return 'wysoka';
  if (v >= 45) return 'średnia';
  if (v >= 30) return 'niska';
  return 'bardzo niska';
}

export function CandidateModal({ candId, onClose }: { candId: string; onClose: () => void }) {
  const game = useGame((s) => s.game)!;
  const c = game.candidates.find((x) => x.id === candId)!;
  const own = c.isPlayer || !game.playerId;
  return (
    <Modal onClose={onClose}>
      <div className="modal-head row" style={{ gap: 14, background: `linear-gradient(135deg, ${c.color}40, transparent)` }}>
        <Avatar name={c.name} color={c.color} size={64} />
        <div className="grow">
          <h2 className="display" style={{ fontSize: 26 }}>
            {c.name}
          </h2>
          <div className="small text-2">
            {PARTIES[c.party].name} · {PROFILES[c.profile].label} · {STATE_BY_CODE[c.homeState].name}
          </div>
          <div className="tiny muted">„{c.slogan}” · styl kampanii: {AI_STYLE_LABEL[c.style].toLowerCase()}</div>
        </div>
        <button className="btn sm ghost" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="modal-body col" style={{ gap: 14 }}>
        <div className="row wrap" style={{ gap: 6 }}>
          {c.traits.length === 0 && <span className="tiny muted">Brak wyróżniających cech.</span>}
          {c.traits.map((t) => (
            <span key={t} className={`chip trait ${TRAIT_META[t].good ? 'good' : 'bad'}`} title={TRAIT_META[t].desc}>
              {TRAIT_META[t].icon} {TRAIT_META[t].label}
            </span>
          ))}
        </div>
        <div className="stat-grid two">
          {VISIBLE_STATS.map((k) => (
            <StatLine key={k} k={k} v={c.stats[k]} own={own} color={c.color} />
          ))}
          <div className="col" style={{ gap: 3 }}>
            <div className="spread tiny">
              <span className="muted">{STAT_LABEL.scandalRisk}</span>
              <span>{own ? fuzzy(c.stats.scandalRisk) : '?'}</span>
            </div>
            <div className="tiny muted">Statystyka ukryta — ujawnia się w trakcie kampanii.</div>
          </div>
        </div>
        <div className="row wrap" style={{ gap: 14 }}>
          <span className="small">
            👥 {c.social.followers.toFixed(1)} mln obserwujących
          </span>
          <span className="small">💬 zaangażowanie {c.social.engagement.toFixed(1)}%</span>
          <span className="small">⚡ potencjał viralowy {Math.round(viralPotential(c) * 100)}</span>
          <span className="small">
            {SOCIAL_STRATEGY_META[c.social.strategy].icon} {SOCIAL_STRATEGY_META[c.social.strategy].label}
          </span>
        </div>
        <div className="col" style={{ gap: 4 }}>
          <div className="panel-title">Program</div>
          {ISSUES.map((iss) => (
            <div key={iss.id} className="spread small">
              <span>
                {iss.icon} {iss.label}
              </span>
              <span className="tiny" style={{ color: c.positions[iss.id] < -10 ? '#93c5fd' : c.positions[iss.id] > 10 ? '#fca5a5' : 'var(--text-2)' }}>
                {positionLabel(c.positions[iss.id])}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function StatLine({ k, v, own, color }: { k: keyof CandidateStats; v: number; own: boolean; color: string }) {
  return (
    <div className="col" style={{ gap: 3 }}>
      <div className="spread tiny">
        <span className="muted">{STAT_LABEL[k]}</span>
        <span className="mono">{own ? Math.round(v) : fuzzy(v)}</span>
      </div>
      <div className="bar">
        <div style={{ width: `${own ? v : Math.round(v / 20) * 20}%`, background: own ? color : `repeating-linear-gradient(90deg, ${color} 0 6px, transparent 6px 9px)` }} />
      </div>
    </div>
  );
}
