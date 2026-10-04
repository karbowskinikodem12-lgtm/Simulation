import { useEffect } from 'react';
import { useGame } from '../../store/gameStore';
import { useT } from '../../i18n/useT';

/** Animated "BREAKING NEWS" banner for major events. Auto-dismisses after a few seconds. */
export function BreakingBanner() {
  const item = useGame((s) => s.breaking);
  const dismiss = useGame((s) => s.dismissBreaking);
  const game = useGame((s) => s.game);
  const { t, loc } = useT();
  useEffect(() => {
    if (!item) return;
    const id = setTimeout(dismiss, 5500);
    return () => clearTimeout(id);
  }, [item, dismiss]);
  if (!item || !game) return null;
  const c = game.candidates.find((x) => x.id === item.candId);
  return (
    <div className="bn-banner" key={item.id} onClick={dismiss}>
      <div className="bn-label display">
        <span className="bn-dot" /> {t('PILNE', 'BREAKING')}
      </div>
      <div className="bn-body">
        <div className="bn-head">{loc(item.headline)}</div>
        {item.body && <div className="small text-2">{loc(item.body)}</div>}
      </div>
      {c && <div className="bn-cand" style={{ background: c.color }} />}
      <div className="bn-timer" />
    </div>
  );
}
