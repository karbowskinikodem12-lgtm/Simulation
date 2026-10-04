import type { IssueId, Region } from '../engine/types';
import { L, type LStr } from '../i18n';

export interface StateInfo {
  code: string;
  /** English name. */
  name: string;
  /** Polish name (exonym where one is in common use). */
  namePl: string;
  fips: string;
  ev: number;
  /** Voting-eligible population, millions. */
  vep: number;
  /** Baseline turnout of VEP (fraction). */
  turnout: number;
  /** Partisan lean as R-minus-D margin relative to the nation (fraction, + = Republican). */
  lean: number;
  region: Region;
  demo: { urban: number; college: number; hispanic: number; black: number; religious: number; seniors: number };
  /** Share of ballots cast before Election Day. */
  earlyVote: number;
  /** Final poll closing time, hours Eastern (25 = 1am). */
  pollClose: number;
  /** Relative vote-counting speed on election night. */
  countSpeed: number;
  /** Congressional districts with separate electoral votes (Maine, Nebraska). */
  districts?: { id: string; lean: number }[];
}

const NATIONAL_2024_MARGIN = 1.5;

// code, name, fips, ev, vep, turnout%, 2024 margin R-D (pp), region,
// urban, college, hispanic, black, religious, seniors, earlyVote, pollClose, countSpeed
type Row = [string, string, string, number, number, number, number, Region, number, number, number, number, number, number, number, number, number];

const ROWS: Row[] = [
  ['AL', 'Alabama', '01', 9, 3.8, 63, 30.5, 'south', 0.58, 0.27, 0.05, 0.27, 0.35, 0.18, 0.1, 20, 1.1],
  ['AK', 'Alaska', '02', 3, 0.53, 69, 13.1, 'west', 0.65, 0.3, 0.07, 0.03, 0.22, 0.13, 0.35, 25, 0.3],
  ['AZ', 'Arizona', '04', 11, 5.3, 66, 5.5, 'mountain', 0.89, 0.31, 0.32, 0.05, 0.2, 0.19, 0.8, 21, 0.35],
  ['AR', 'Arkansas', '05', 6, 2.2, 56, 30.6, 'south', 0.56, 0.24, 0.08, 0.15, 0.4, 0.18, 0.6, 20.5, 1.1],
  ['CA', 'California', '06', 54, 26.0, 68, -20.2, 'west', 0.94, 0.36, 0.4, 0.06, 0.1, 0.15, 0.85, 23, 0.3],
  ['CO', 'Colorado', '08', 10, 4.3, 76, -11.0, 'mountain', 0.86, 0.43, 0.22, 0.04, 0.18, 0.15, 0.9, 21, 0.9],
  ['CT', 'Connecticut', '09', 7, 2.6, 71, -14.5, 'northeast', 0.86, 0.41, 0.17, 0.11, 0.07, 0.18, 0.25, 20, 0.9],
  ['DE', 'Delaware', '10', 3, 0.74, 71, -14.7, 'northeast', 0.82, 0.34, 0.1, 0.23, 0.14, 0.2, 0.4, 20, 1.2],
  ['DC', 'District of Columbia', '11', 3, 0.53, 66, -83.8, 'northeast', 1.0, 0.6, 0.11, 0.44, 0.05, 0.12, 0.6, 20, 1.2],
  ['FL', 'Florida', '12', 30, 15.9, 72, 13.1, 'south', 0.91, 0.32, 0.27, 0.16, 0.18, 0.21, 0.75, 20, 1.4],
  ['GA', 'Georgia', '13', 16, 7.5, 67, 2.2, 'south', 0.74, 0.33, 0.1, 0.32, 0.28, 0.15, 0.7, 19, 1.0],
  ['HI', 'Hawaii', '15', 4, 1.0, 58, -23.1, 'west', 0.86, 0.34, 0.11, 0.02, 0.1, 0.19, 0.9, 24, 0.9],
  ['ID', 'Idaho', '16', 4, 1.3, 68, 36.5, 'mountain', 0.69, 0.29, 0.13, 0.01, 0.3, 0.17, 0.45, 23, 0.9],
  ['IL', 'Illinois', '17', 19, 9.0, 67, -10.9, 'midwest', 0.88, 0.37, 0.18, 0.14, 0.12, 0.17, 0.55, 20, 0.8],
  ['IN', 'Indiana', '18', 11, 5.0, 61, 19.0, 'midwest', 0.72, 0.28, 0.08, 0.1, 0.27, 0.17, 0.45, 19, 1.0],
  ['IA', 'Iowa', '19', 6, 2.3, 73, 13.2, 'midwest', 0.64, 0.3, 0.06, 0.04, 0.24, 0.18, 0.5, 22, 1.0],
  ['KS', 'Kansas', '20', 6, 2.1, 66, 16.1, 'midwest', 0.74, 0.34, 0.13, 0.06, 0.25, 0.17, 0.5, 21, 0.9],
  ['KY', 'Kentucky', '21', 8, 3.4, 65, 30.5, 'south', 0.58, 0.26, 0.04, 0.08, 0.4, 0.17, 0.3, 19, 1.1],
  ['LA', 'Louisiana', '22', 8, 3.4, 65, 22.0, 'south', 0.72, 0.26, 0.07, 0.32, 0.25, 0.17, 0.4, 21, 1.0],
  ['ME', 'Maine', '23', 4, 1.1, 77, -6.9, 'northeast', 0.39, 0.34, 0.02, 0.02, 0.1, 0.22, 0.4, 20, 0.7],
  ['MD', 'Maryland', '24', 10, 4.3, 72, -28.5, 'northeast', 0.87, 0.42, 0.11, 0.3, 0.1, 0.16, 0.55, 20, 0.7],
  ['MA', 'Massachusetts', '25', 11, 5.0, 72, -25.2, 'northeast', 0.92, 0.46, 0.13, 0.07, 0.06, 0.18, 0.5, 20, 1.0],
  ['MI', 'Michigan', '26', 15, 7.6, 74, 1.4, 'midwest', 0.74, 0.31, 0.06, 0.14, 0.22, 0.18, 0.6, 21, 0.6],
  ['MN', 'Minnesota', '27', 10, 4.1, 80, -4.2, 'midwest', 0.73, 0.38, 0.06, 0.07, 0.17, 0.17, 0.55, 21, 0.9],
  ['MS', 'Mississippi', '28', 6, 2.2, 61, 22.9, 'south', 0.49, 0.23, 0.03, 0.38, 0.38, 0.17, 0.15, 20, 0.8],
  ['MO', 'Missouri', '29', 10, 4.6, 66, 18.4, 'midwest', 0.7, 0.31, 0.05, 0.11, 0.3, 0.18, 0.3, 20, 1.0],
  ['MT', 'Montana', '30', 4, 0.85, 74, 19.9, 'mountain', 0.53, 0.34, 0.04, 0.01, 0.2, 0.2, 0.65, 22, 0.9],
  ['NE', 'Nebraska', '31', 5, 1.4, 70, 20.4, 'midwest', 0.73, 0.33, 0.12, 0.05, 0.22, 0.16, 0.5, 21, 0.9],
  ['NV', 'Nevada', '32', 6, 2.1, 65, 3.1, 'mountain', 0.94, 0.26, 0.3, 0.1, 0.14, 0.17, 0.8, 22, 0.35],
  ['NH', 'New Hampshire', '33', 4, 1.1, 76, -2.8, 'northeast', 0.58, 0.39, 0.05, 0.02, 0.1, 0.2, 0.2, 20, 1.0],
  ['NJ', 'New Jersey', '34', 14, 6.3, 72, -5.9, 'northeast', 0.94, 0.42, 0.22, 0.13, 0.07, 0.17, 0.55, 20, 0.8],
  ['NM', 'New Mexico', '35', 5, 1.5, 62, -6.0, 'mountain', 0.77, 0.29, 0.5, 0.02, 0.16, 0.19, 0.7, 21, 1.0],
  ['NY', 'New York', '36', 28, 13.8, 65, -12.6, 'northeast', 0.88, 0.39, 0.19, 0.15, 0.08, 0.18, 0.35, 21, 0.6],
  ['NC', 'North Carolina', '37', 16, 7.7, 72, 3.2, 'south', 0.66, 0.34, 0.1, 0.21, 0.28, 0.17, 0.75, 19.5, 1.1],
  ['ND', 'North Dakota', '38', 3, 0.57, 64, 36.5, 'midwest', 0.6, 0.31, 0.04, 0.03, 0.22, 0.16, 0.5, 21, 1.1],
  ['OH', 'Ohio', '39', 17, 8.8, 68, 11.2, 'midwest', 0.78, 0.3, 0.05, 0.12, 0.24, 0.18, 0.45, 19.5, 1.0],
  ['OK', 'Oklahoma', '40', 7, 2.8, 55, 34.3, 'south', 0.66, 0.27, 0.11, 0.07, 0.4, 0.16, 0.3, 20, 1.2],
  ['OR', 'Oregon', '41', 8, 3.1, 75, -14.3, 'west', 0.81, 0.36, 0.14, 0.02, 0.17, 0.19, 0.95, 23, 0.45],
  ['PA', 'Pennsylvania', '42', 19, 9.8, 71, 1.7, 'northeast', 0.79, 0.33, 0.08, 0.11, 0.18, 0.19, 0.4, 20, 0.5],
  ['RI', 'Rhode Island', '44', 4, 0.8, 64, -13.8, 'northeast', 0.91, 0.36, 0.17, 0.06, 0.06, 0.18, 0.4, 20, 1.1],
  ['SC', 'South Carolina', '45', 9, 3.9, 64, 17.8, 'south', 0.66, 0.31, 0.06, 0.25, 0.32, 0.19, 0.55, 19, 1.0],
  ['SD', 'South Dakota', '46', 3, 0.65, 66, 29.2, 'midwest', 0.57, 0.3, 0.04, 0.02, 0.24, 0.18, 0.4, 21, 1.1],
  ['TN', 'Tennessee', '47', 11, 5.2, 60, 29.7, 'south', 0.66, 0.29, 0.06, 0.16, 0.4, 0.17, 0.65, 20, 1.1],
  ['TX', 'Texas', '48', 40, 18.7, 60, 13.7, 'south', 0.85, 0.31, 0.4, 0.12, 0.26, 0.13, 0.65, 21, 0.9],
  ['UT', 'Utah', '49', 6, 2.2, 68, 21.6, 'mountain', 0.9, 0.36, 0.15, 0.01, 0.45, 0.11, 0.9, 22, 0.5],
  ['VT', 'Vermont', '50', 3, 0.5, 74, -31.5, 'northeast', 0.35, 0.4, 0.02, 0.01, 0.07, 0.21, 0.7, 19, 1.0],
  ['VA', 'Virginia', '51', 13, 6.1, 73, -5.8, 'south', 0.75, 0.41, 0.1, 0.19, 0.2, 0.16, 0.65, 19, 0.9],
  ['WA', 'Washington', '53', 12, 5.4, 75, -18.2, 'west', 0.84, 0.38, 0.14, 0.04, 0.14, 0.16, 0.95, 23, 0.45],
  ['WV', 'West Virginia', '54', 4, 1.4, 58, 41.9, 'south', 0.49, 0.22, 0.02, 0.04, 0.35, 0.21, 0.4, 19.5, 1.1],
  ['WI', 'Wisconsin', '55', 10, 4.4, 76, 0.9, 'midwest', 0.7, 0.32, 0.07, 0.06, 0.2, 0.18, 0.55, 21, 0.6],
  ['WY', 'Wyoming', '56', 3, 0.43, 65, 45.8, 'mountain', 0.65, 0.28, 0.1, 0.01, 0.25, 0.18, 0.45, 21, 1.2],
];

const DISTRICTS: Record<string, { id: string; margin: number }[]> = {
  ME: [
    { id: 'ME-1', margin: -23 },
    { id: 'ME-2', margin: 9 },
  ],
  NE: [
    { id: 'NE-1', margin: 12 },
    { id: 'NE-2', margin: -4.6 },
    { id: 'NE-3', margin: 51 },
  ],
};

const POLISH_NAMES: Record<string, string> = {"CA": "Kalifornia", "DC": "Dystrykt Kolumbii", "FL": "Floryda", "HI": "Hawaje", "LA": "Luizjana", "MS": "Missisipi", "NM": "Nowy Meksyk", "NY": "Nowy Jork", "NC": "Karolina Północna", "ND": "Dakota Północna", "PA": "Pensylwania", "SC": "Karolina Południowa", "SD": "Dakota Południowa", "TX": "Teksas", "VA": "Wirginia", "WA": "Waszyngton", "WV": "Wirginia Zachodnia", "CO": "Kolorado", "GA": "Georgia"};

export const STATES: StateInfo[] = ROWS.map((r) => ({
  code: r[0],
  name: r[1],
  namePl: POLISH_NAMES[r[0]] ?? r[1],
  fips: r[2],
  ev: r[3],
  vep: r[4],
  turnout: r[5] / 100,
  lean: (r[6] - NATIONAL_2024_MARGIN) / 100,
  region: r[7],
  demo: { urban: r[8], college: r[9], hispanic: r[10], black: r[11], religious: r[12], seniors: r[13] },
  earlyVote: r[14],
  pollClose: r[15],
  countSpeed: r[16],
  districts: DISTRICTS[r[0]]?.map((d) => ({ id: d.id, lean: (d.margin - NATIONAL_2024_MARGIN) / 100 })),
}));

export const STATE_BY_CODE: Record<string, StateInfo> = Object.fromEntries(STATES.map((s) => [s.code, s]));
export const STATE_BY_FIPS: Record<string, StateInfo> = Object.fromEntries(STATES.map((s) => [s.fips, s]));
export const STATE_CODES = STATES.map((s) => s.code);
export const TOTAL_EV = STATES.reduce((a, s) => a + s.ev, 0);
export const EV_TO_WIN = Math.floor(TOTAL_EV / 2) + 1;

export const REGION_LABEL: Record<Region, LStr> = {
  northeast: L('Północny Wschód', 'Northeast'),
  south: L('Południe', 'South'),
  midwest: L('Środkowy Zachód', 'Midwest'),
  west: L('Wybrzeże Pacyfiku', 'Pacific Coast'),
  mountain: L('Góry Skaliste i Południowy Zachód', 'Mountain West & Southwest'),
};

/** Localized state name. */
export function stateName(code: string): LStr {
  const s = STATE_BY_CODE[code];
  return s ? { pl: s.namePl, en: s.name } : { pl: code, en: code };
}

/** States that host rich donor networks (better fundraisers). */
export const DONOR_HUBS = new Set(['CA', 'NY', 'TX', 'FL', 'IL', 'MA', 'NJ', 'WA', 'DC', 'CT']);

const BORDER = new Set(['TX', 'AZ', 'NM', 'CA']);
const RUST_BELT = new Set(['MI', 'PA', 'WI', 'OH', 'IN', 'MN']);
const ENERGY = new Set(['TX', 'WV', 'WY', 'ND', 'OK', 'LA', 'AK', 'NM', 'PA']);
const MILITARY = new Set(['VA', 'NC', 'GA', 'TX', 'HI', 'AK', 'CO', 'FL']);
const DISASTER_COAST = new Set(['FL', 'LA', 'TX', 'NC', 'SC', 'GA', 'AL', 'MS']);

/** How strongly each issue matters in a state relative to the national agenda (multiplier ~0.6-1.8). */
export function stateIssueWeight(s: StateInfo, issue: IssueId): number {
  const d = s.demo;
  switch (issue) {
    case 'economy':
      return 1;
    case 'inflation':
      return 1 + (0.32 - d.college) * 0.8;
    case 'jobs':
      return 0.9 + (RUST_BELT.has(s.code) ? 0.45 : 0) + (s.region === 'midwest' ? 0.15 : 0);
    case 'immigration':
      return 0.8 + d.hispanic * 0.9 + (BORDER.has(s.code) ? 0.4 : 0) + (s.code === 'FL' ? 0.25 : 0);
    case 'taxes':
      return 0.9 + (d.college - 0.3) * 0.6 + (s.region === 'northeast' ? 0.1 : 0);
    case 'healthcare':
      return 0.7 + d.seniors * 2.2;
    case 'security':
      return 0.8 + d.urban * 0.35;
    case 'foreign':
      return 0.85 + (MILITARY.has(s.code) ? 0.3 : 0);
    case 'climate':
      return 0.8 + (s.region === 'west' ? 0.35 : 0) + (ENERGY.has(s.code) ? 0.35 : 0) + (DISASTER_COAST.has(s.code) ? 0.1 : 0);
    case 'social':
      return 0.75 + d.religious * 1.4;
    case 'education':
      return 0.8 + d.college * 0.6;
  }
}

/** State-specific shift of the median voter's view on an issue, on top of partisan lean. */
export function stateIssueBias(s: StateInfo, issue: IssueId): number {
  const d = s.demo;
  switch (issue) {
    case 'immigration':
      return -d.hispanic * 22 + (BORDER.has(s.code) ? 6 : 0);
    case 'social':
      return (d.religious - 0.22) * 70 - (d.college - 0.33) * 40;
    case 'climate':
      return (ENERGY.has(s.code) ? 14 : 0) - (d.college - 0.33) * 45;
    case 'jobs':
      return RUST_BELT.has(s.code) ? -6 : 0; // protectionist/union-friendly
    case 'security':
      return (0.8 - d.urban) * 12;
    case 'taxes':
      return -(d.college - 0.33) * 20;
    case 'healthcare':
      return -(d.seniors - 0.17) * 50;
    case 'education':
      return -(d.college - 0.33) * 30;
    default:
      return 0;
  }
}

export { BORDER, RUST_BELT, ENERGY, DISASTER_COAST };
