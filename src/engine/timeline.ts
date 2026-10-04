// Campaign calendar: named phases, conventions and the countdown to Election Day.

import type { GameState } from './types';

export type PhaseId = 'launch' | 'early' | 'conventions' | 'general' | 'debates' | 'final' | 'electionDay';

export interface PhaseDef {
  id: PhaseId;
  label: string;
  short: string;
  from: number; // fraction of the campaign
  to: number;
  desc: string;
}

export const PHASES: PhaseDef[] = [
  { id: 'launch', label: 'Start kampanii', short: 'Start', from: 0, to: 0.04, desc: 'Ogłoszenie startu, pierwsze sondaże i budowa sztabu.' },
  { id: 'early', label: 'Wczesna kampania i prawybory', short: 'Prawybory', from: 0.04, to: 0.17, desc: 'Domykanie nominacji, wybór kandydata na wiceprezydenta, budowa struktur w stanach.' },
  { id: 'conventions', label: 'Konwencje krajowe', short: 'Konwencje', from: 0.17, to: 0.3, desc: 'Partie oficjalnie nominują kandydatów — szansa na „convention bounce”.' },
  { id: 'general', label: 'Kampania właściwa', short: 'Kampania', from: 0.3, to: 0.42, desc: 'Pełna mobilizacja: wiece, reklamy, zbiórki w swing states.' },
  { id: 'debates', label: 'Sezon debat', short: 'Debaty', from: 0.42, to: 0.8, desc: 'Trzy debaty prezydenckie mogą odwrócić trend.' },
  { id: 'final', label: 'Ostatnie tygodnie', short: 'Finisz', from: 0.8, to: 1, desc: 'Głosowanie przedterminowe, October Surprise, ostatnia mobilizacja.' },
  { id: 'electionDay', label: 'Dzień wyborów', short: 'Wybory', from: 1, to: 1, desc: 'Lokale wyborcze otwarte.' },
];

export function phaseOf(game: Pick<GameState, 'day' | 'settings'>): PhaseDef {
  const p = game.day / game.settings.totalDays;
  if (p >= 1) return PHASES[PHASES.length - 1];
  return PHASES.find((ph) => p >= ph.from && p < ph.to) ?? PHASES[0];
}

export function scheduleConventions(game: GameState): { candId: string; day: number; done: boolean }[] {
  const T = game.settings.totalDays;
  // Out-party convenes first, the incumbent party last (as in real cycles).
  const order = [...game.candidates].sort((a, b) => Number(a.party === game.settings.incumbentParty) - Number(b.party === game.settings.incumbentParty));
  const span = 0.3 - 0.18;
  return order.map((c, i) => ({ candId: c.id, day: Math.round(T * (0.18 + (span * (i + 0.5)) / order.length)), done: false }));
}
