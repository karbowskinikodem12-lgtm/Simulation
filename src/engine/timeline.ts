// Campaign calendar: named phases, conventions and the countdown to Election Day.

import type { GameState } from './types';
import { L, type LStr } from '../i18n';

export type PhaseId = 'launch' | 'early' | 'conventions' | 'general' | 'debates' | 'final' | 'electionDay';

export interface PhaseDef {
  id: PhaseId;
  label: LStr;
  short: LStr;
  from: number; // fraction of the campaign
  to: number;
  desc: LStr;
}

export const PHASES: PhaseDef[] = [
  { id: 'launch', label: L('Start kampanii', 'Campaign launch'), short: L('Start', 'Launch'), from: 0, to: 0.04, desc: L('Ogłoszenie startu, pierwsze sondaże i budowa sztabu.', 'Launch announcement, first polls and building the team.') },
  { id: 'early', label: L('Wczesna kampania i prawybory', 'Primaries & early campaign'), short: L('Prawybory', 'Primaries'), from: 0.04, to: 0.17, desc: L('Domykanie nominacji, wybór kandydata na wiceprezydenta, budowa struktur w stanach.', 'Wrapping up the nomination, picking a running mate, building state operations.') },
  { id: 'conventions', label: L('Konwencje krajowe', 'National conventions'), short: L('Konwencje', 'Conventions'), from: 0.17, to: 0.3, desc: L('Partie oficjalnie nominują kandydatów — szansa na wzrost poparcia po konwencji.', 'Parties formally nominate their candidates — a chance for a convention bounce.') },
  { id: 'general', label: L('Kampania właściwa', 'General election campaign'), short: L('Kampania', 'Campaign'), from: 0.3, to: 0.42, desc: L('Pełna mobilizacja: wiece, reklamy, zbiórki w stanach wahających się.', 'Full mobilization: rallies, ads and fundraising in the swing states.') },
  { id: 'debates', label: L('Sezon debat', 'Debate season'), short: L('Debaty', 'Debates'), from: 0.42, to: 0.8, desc: L('Trzy debaty prezydenckie mogą odwrócić trend.', 'Three presidential debates can turn the tide.') },
  { id: 'final', label: L('Ostatnie tygodnie', 'Final weeks'), short: L('Finisz', 'Final stretch'), from: 0.8, to: 1, desc: L('Głosowanie przedterminowe, październikowa niespodzianka, ostatnia mobilizacja.', 'Early voting, the October surprise, the final push.') },
  { id: 'electionDay', label: L('Dzień wyborów', 'Election Day'), short: L('Wybory', 'Election'), from: 1, to: 1, desc: L('Lokale wyborcze otwarte.', 'Polls are open.') },
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
