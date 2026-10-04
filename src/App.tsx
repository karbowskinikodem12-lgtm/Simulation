import { useGame } from './store/gameStore';
import { MainMenu } from './ui/screens/MainMenu';
import { SetupScreen } from './ui/screens/SetupScreen';
import { CampaignScreen } from './ui/screens/CampaignScreen';
import { ElectionNight } from './ui/screens/ElectionNight';
import { ResultsScreen } from './ui/screens/ResultsScreen';
import { Toasts } from './ui/components/common';

export function App() {
  const screen = useGame((s) => s.screen);
  return (
    <>
      {screen === 'menu' && <MainMenu />}
      {screen === 'setup' && <SetupScreen />}
      {screen === 'campaign' && <CampaignScreen />}
      {screen === 'election' && <ElectionNight />}
      {screen === 'results' && <ResultsScreen />}
      <Toasts />
    </>
  );
}
