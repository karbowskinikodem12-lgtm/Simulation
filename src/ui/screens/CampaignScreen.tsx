import { useEffect } from 'react';
import { useGame, type Speed } from '../../store/gameStore';
import { TopBar } from '../campaign/TopBar';
import { LeftPanel } from '../campaign/LeftPanel';
import { RightPanel } from '../campaign/RightPanel';
import { MapArea } from '../campaign/MapArea';
import { Ticker, NewsLog } from '../campaign/Ticker';
import { EventModal } from '../modals/EventModal';
import { DebateModal } from '../modals/DebateModal';
import { HelpModal } from '../modals/HelpModal';

/** Milliseconds per campaign day at each speed. */
const DAY_MS: Record<Speed, number> = { 0: 0, 1: 1500, 2: 750, 3: 300 };

export function CampaignScreen() {
  const speed = useGame((s) => s.speed);
  const game = useGame((s) => s.game);
  const showLog = useGame((s) => s.showLog);
  const showHelp = useGame((s) => s.showHelp);
  const { tick, setSpeed, selectState, toggleHelp } = useGame();
  const blocked = !!game?.pendingEvent || !!game?.liveDebate;

  // Campaign clock.
  useEffect(() => {
    if (!speed || blocked || showHelp) return;
    const id = setInterval(tick, DAY_MS[speed]);
    return () => clearInterval(id);
  }, [speed, blocked, showHelp, tick]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        const s = useGame.getState().speed;
        setSpeed(s === 0 ? 1 : 0);
      } else if (e.key === '1' || e.key === '2' || e.key === '3') setSpeed(Number(e.key) as Speed);
      else if (e.key === 'Escape') selectState(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSpeed, selectState]);

  if (!game) return null;
  return (
    <div className="campaign-screen">
      <TopBar />
      <div className="campaign-body">
        <LeftPanel />
        <MapArea />
        <RightPanel />
      </div>
      <Ticker />
      {game.pendingEvent && <EventModal />}
      {game.liveDebate && <DebateModal />}
      {showLog && <NewsLog />}
      {showHelp && <HelpModal onClose={() => toggleHelp(false)} />}
    </div>
  );
}
