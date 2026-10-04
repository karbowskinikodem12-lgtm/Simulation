import type { PartyId, Positions } from '../engine/types';
import { L, type LStr } from '../i18n';

export interface PartyDef {
  id: PartyId;
  name: LStr;
  short: LStr;
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
  description: LStr;
}

export const PARTIES: Record<PartyId, PartyDef> = {
  DEM: {
    id: 'DEM',
    name: L('Partia Demokratyczna', 'Democratic Party'),
    short: L('DEM', 'DEM'),
    color: '#3b82f6',
    axis: -1,
    identity: 1,
    brandPenalty: 0,
    startFunds: 45,
    dailyIncome: 1.0,
    defaults: { economy: -40, inflation: -35, jobs: -50, immigration: -40, taxes: -50, healthcare: -55, security: -25, foreign: -30, climate: -60, social: -60, education: -50 },
    description: L('Centrolewica: rozbudowane państwo opiekuńcze, ochrona klimatu, prawa obywatelskie.', 'Center-left: a strong safety net, climate action, civil rights.'),
  },
  REP: {
    id: 'REP',
    name: L('Partia Republikańska', 'Republican Party'),
    short: L('REP', 'REP'),
    color: '#ef4444',
    axis: 1,
    identity: 1,
    brandPenalty: 0,
    startFunds: 45,
    dailyIncome: 1.0,
    defaults: { economy: 45, inflation: 40, jobs: 30, immigration: 60, taxes: 55, healthcare: 40, security: 50, foreign: 35, climate: 45, social: 48, education: 40 },
    description: L('Prawica: niskie podatki, kontrola granic, tradycyjne wartości, silna armia.', 'Right: low taxes, border control, traditional values, a strong military.'),
  },
  LIB: {
    id: 'LIB',
    name: L('Partia Libertariańska', 'Libertarian Party'),
    short: L('LIB', 'LIB'),
    color: '#eab308',
    axis: 0.35,
    identity: 0.3,
    brandPenalty: 1.9,
    startFunds: 6,
    dailyIncome: 0.12,
    defaults: { economy: 85, inflation: 70, jobs: 70, immigration: -20, taxes: 90, healthcare: 70, security: -40, foreign: -60, climate: 40, social: -50, education: 75 },
    description: L('Minimalne państwo, wolność osobista i gospodarcza, nieinterwencjonizm.', 'Minimal government, personal and economic freedom, non-interventionism.'),
  },
  GRN: {
    id: 'GRN',
    name: L('Partia Zielonych', 'Green Party'),
    short: L('ZIE', 'GRN'),
    color: '#22c55e',
    axis: -0.6,
    identity: 0.3,
    brandPenalty: 2.0,
    startFunds: 4,
    dailyIncome: 0.08,
    defaults: { economy: -75, inflation: -60, jobs: -70, immigration: -70, taxes: -75, healthcare: -90, security: -65, foreign: -75, climate: -95, social: -80, education: -80 },
    description: L('Ekologia, sprawiedliwość społeczna, demokracja oddolna, pacyfizm.', 'Ecology, social justice, grassroots democracy, pacifism.'),
  },
  IND: {
    id: 'IND',
    name: L('Kandydat niezależny', 'Independent'),
    short: L('NZL', 'IND'),
    color: '#a855f7',
    axis: 0,
    identity: 0,
    brandPenalty: 1.6,
    startFunds: 10,
    dailyIncome: 0.18,
    defaults: { economy: 10, inflation: 0, jobs: -10, immigration: 10, taxes: 0, healthcare: -10, security: 15, foreign: 0, climate: -10, social: 0, education: 0 },
    description: L('Kandydat spoza systemu partyjnego — pragmatyczny centrysta lub outsider.', 'A candidate outside the party system — a pragmatic centrist or outsider.'),
  },
};

export const PARTY_LIST = Object.values(PARTIES);
