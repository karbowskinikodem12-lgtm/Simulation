import { useGame } from '../../store/gameStore';
import { PARTIES } from '../../data/parties';
import { PROFILES, STAT_LABEL, TRAIT_META, VISIBLE_STATS, AI_STYLE_LABEL } from '../../data/profiles';
import { stateName } from '../../data/states';
import { ISSUES, positionLabel } from '../../data/issues';
import { Avatar, Modal } from '../components/common';
import { SOCIAL_STRATEGY_META, viralPotential } from '../../engine/social';
import type { CandidateStats } from '../../engine/types';
import { L, loc as locIn, type Lang, type LStr } from '../../i18n';
import { useT } from '../../i18n/useT';

/** Rivals' stats are only known roughly — campaigns never know each other's numbers. */
function fuzzyL(v: number): LStr {
  if (v >= 80) return L('bardzo wysoka', 'very high');
  if (v >= 65) return L('wysoka', 'high');
  if (v >= 45) return L('średnia', 'average');
  if (v >= 30) return L('niska', 'low');
  return L('bardzo niska', 'very low');
}

function fuzzy(v: number, lang: Lang): string {
  return locIn(fuzzyL(v), lang);
}

export function CandidateModal({ candId, onClose }: { candId: string; onClose: () => void }) {
  const game = useGame((s) => s.game)!;
  const c = game.candidates.find((x) => x.id === candId)!;
  const own = c.isPlayer || !game.playerId;
  const { t, loc, lang, q } = useT();
  return (
    <Modal onClose={onClose}>
      <div className="modal-head row" style={{ gap: 14, background: `linear-gradient(135deg, ${c.color}40, transparent)` }}>
        <Avatar name={c.name} color={c.color} size={64} />
        <div className="grow">
          <h2 className="display" style={{ fontSize: 26 }}>
            {c.name}
          </h2>
          <div className="small text-2">
            {loc(PARTIES[c.party].name)} · {loc(PROFILES[c.profile].label)} · {loc(stateName(c.homeState))}
          </div>
          <div className="tiny muted">{q(c.slogan)} · {t('styl kampanii', 'campaign style')}: {loc(AI_STYLE_LABEL[c.style]).toLowerCase()}</div>
        </div>
        <button className="btn sm ghost" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="modal-body col" style={{ gap: 14 }}>
        <div className="row wrap" style={{ gap: 6 }}>
          {c.traits.length === 0 && <span className="tiny muted">{t('Brak wyróżniających cech.', 'No distinctive traits.')}</span>}
          {c.traits.map((tr) => (
            <span key={tr} className={`chip trait ${TRAIT_META[tr].good ? 'good' : 'bad'}`} title={loc(TRAIT_META[tr].desc)}>
              {TRAIT_META[tr].icon} {loc(TRAIT_META[tr].label)}
            </span>
          ))}
        </div>
        <div className="stat-grid two">
          {VISIBLE_STATS.map((k) => (
            <StatLine key={k} k={k} v={c.stats[k]} own={own} color={c.color} />
          ))}
          <div className="col" style={{ gap: 3 }}>
            <div className="spread tiny">
              <span className="muted">{loc(STAT_LABEL.scandalRisk)}</span>
              <span>{own ? fuzzy(c.stats.scandalRisk, lang) : '?'}</span>
            </div>
            <div className="tiny muted">{t('Statystyka ukryta — ujawnia się w trakcie kampanii.', 'Hidden stat — revealed during the campaign.')}</div>
          </div>
        </div>
        <div className="row wrap" style={{ gap: 14 }}>
          <span className="small">
            👥 {c.social.followers.toFixed(1)} {t('mln obserwujących', 'M followers')}
          </span>
          <span className="small">💬 {t('zaangażowanie', 'engagement')} {c.social.engagement.toFixed(1)}%</span>
          <span className="small">⚡ {t('potencjał wiralowy', 'viral potential')} {Math.round(viralPotential(c) * 100)}</span>
          <span className="small">
            {SOCIAL_STRATEGY_META[c.social.strategy].icon} {loc(SOCIAL_STRATEGY_META[c.social.strategy].label)}
          </span>
        </div>
        <div className="col" style={{ gap: 4 }}>
          <div className="panel-title">{t('Program', 'Platform')}</div>
          {ISSUES.map((iss) => (
            <div key={iss.id} className="spread small">
              <span>
                {iss.icon} {loc(iss.label)}
              </span>
              <span className="tiny" style={{ color: c.positions[iss.id] < -10 ? '#93c5fd' : c.positions[iss.id] > 10 ? '#fca5a5' : 'var(--text-2)' }}>
                {loc(positionLabel(c.positions[iss.id]))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function StatLine({ k, v, own, color }: { k: keyof CandidateStats; v: number; own: boolean; color: string }) {
  const { loc, lang } = useT();
  return (
    <div className="col" style={{ gap: 3 }}>
      <div className="spread tiny">
        <span className="muted">{loc(STAT_LABEL[k])}</span>
        <span className="mono">{own ? Math.round(v) : fuzzy(v, lang)}</span>
      </div>
      <div className="bar">
        <div style={{ width: `${own ? v : Math.round(v / 20) * 20}%`, background: own ? color : `repeating-linear-gradient(90deg, ${color} 0 6px, transparent 6px 9px)` }} />
      </div>
    </div>
  );
}
