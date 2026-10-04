import type { PartyId, Positions } from '../engine/types';

export interface PartyDef {
  id: PartyId;
  name: string;
  short: string;
  color: string;
  /** Left(-1) / right(+1) placement used for partisan identity. */
  axis: number;
  /** How strongly partisans vote by party label (0..1). */
  identity: number;
  /** Structural penalty for minor parties (wasted-vote effect, ballot access). */
  brandPenalty: number;
  startFunds: number; // $M
  dailyIncome: number; // $M per day baseline
  defaults: Positions;
  description: string;
}

export const PARTIES: Record<PartyId, PartyDef> = {
  DEM: {
    id: 'DEM',
    name: 'Partia Demokratyczna',
    short: 'DEM',
    color: '#3b82f6',
    axis: -1,
    identity: 1,
    brandPenalty: 0,
    startFunds: 45,
    dailyIncome: 1.0,
    defaults: { economy: -40, inflation: -35, jobs: -50, immigration: -40, taxes: -50, healthcare: -55, security: -25, foreign: -30, climate: -60, social: -60, education: -50 },
    description: 'Centrolewica: rozbudowane państwo opiekuńcze, ochrona klimatu, prawa obywatelskie.',
  },
  REP: {
    id: 'REP',
    name: 'Partia Republikańska',
    short: 'REP',
    color: '#ef4444',
    axis: 1,
    identity: 1,
    brandPenalty: 0,
    startFunds: 45,
    dailyIncome: 1.0,
    defaults: { economy: 45, inflation: 40, jobs: 30, immigration: 60, taxes: 55, healthcare: 40, security: 50, foreign: 35, climate: 45, social: 48, education: 40 },
    description: 'Prawica: niskie podatki, kontrola granic, tradycyjne wartości, silna armia.',
  },
  LIB: {
    id: 'LIB',
    name: 'Partia Libertariańska',
    short: 'LIB',
    color: '#eab308',
    axis: 0.35,
    identity: 0.3,
    brandPenalty: 1.9,
    startFunds: 6,
    dailyIncome: 0.12,
    defaults: { economy: 85, inflation: 70, jobs: 70, immigration: -20, taxes: 90, healthcare: 70, security: -40, foreign: -60, climate: 40, social: -50, education: 75 },
    description: 'Minimalne państwo, wolność osobista i gospodarcza, nieinterwencjonizm.',
  },
  GRN: {
    id: 'GRN',
    name: 'Partia Zielonych',
    short: 'GRN',
    color: '#22c55e',
    axis: -0.6,
    identity: 0.3,
    brandPenalty: 2.0,
    startFunds: 4,
    dailyIncome: 0.08,
    defaults: { economy: -75, inflation: -60, jobs: -70, immigration: -70, taxes: -75, healthcare: -90, security: -65, foreign: -75, climate: -95, social: -80, education: -80 },
    description: 'Ekologia, sprawiedliwość społeczna, demokracja oddolna, pacyfizm.',
  },
  IND: {
    id: 'IND',
    name: 'Niezależny',
    short: 'NZL',
    color: '#a855f7',
    axis: 0,
    identity: 0,
    brandPenalty: 1.6,
    startFunds: 10,
    dailyIncome: 0.18,
    defaults: { economy: 10, inflation: 0, jobs: -10, immigration: 10, taxes: 0, healthcare: -10, security: 15, foreign: 0, climate: -10, social: 0, education: 0 },
    description: 'Kandydat spoza systemu partyjnego — pragmatyczny centrysta lub outsider.',
  },
};

export const PARTY_LIST = Object.values(PARTIES);
