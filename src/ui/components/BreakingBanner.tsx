import { useEffect } from 'react';
import { useGame } from '../../store/gameStore';

/** Animated "BREAKING NEWS" banner for major events. Auto-dismisses after a few seconds. */
export function BreakingBanner() {
  const item = useGame((s) => s.breaking);
  const dismiss = useGame((s) => s.dismissBreaking);
  const game = useGame((s) => s.game);
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
        <span className="bn-dot" /> PILNE
      </div>
      <div className="bn-body">
        <div className="bn-head">{item.headline}</div>
        {item.body && <div className="small text-2">{item.body}</div>}
      </div>
      {c && <div className="bn-cand" style={{ background: c.color }} />}
      <div className="bn-timer" />
    </div>
  );
}
