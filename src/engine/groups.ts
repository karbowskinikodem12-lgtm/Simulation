// Voter groups. Every state's electorate is split into 18 segments (place × age × education),
// each with its own partisan lean, issue priorities, issue views, media habits, turnout propensity,
// income mix and share of independents. Segment constants are derived once from state
// demographics and centred so that the state as a whole keeps its historical lean.

import { STATES, type StateInfo } from '../data/states';
import { ISSUE_IDS } from '../data/issues';
import type { GroupId, IssueId } from './types';
import { clamp } from './util';
import { L, type LStr } from '../i18n';

export type Place = 'city' | 'suburb' | 'rural';
export type Age = 'young' | 'middle' | 'senior';
export type Edu = 'college' | 'noncollege';
type Income = 'lowInc' | 'midInc' | 'highInc';

export const GROUP_LABEL: Record<GroupId, LStr> = {
  young: L('Młodzi (18–29)', 'Young (18–29)'),
  middle: L('W średnim wieku (30–64)', 'Middle-aged (30–64)'),
  senior: L('Seniorzy (65+)', 'Seniors (65+)'),
  city: L('Duże miasta', 'Big cities'),
  suburb: L('Przedmieścia', 'Suburbs'),
  rural: L('Obszary wiejskie', 'Rural areas'),
  college: L('Z wyższym wykształceniem', 'College graduates'),
  noncollege: L('Bez dyplomu uczelni', 'Non-college'),
  lowInc: L('Niskie dochody', 'Low income'),
  midInc: L('Średnie dochody', 'Middle income'),
  highInc: L('Wysokie dochody', 'High income'),
  independent: L('Wyborcy niezależni', 'Independents'),
};

/** Group names as used inside sentences ("…among {group}"; Polish genitive). */
export const GROUP_SHORT: Record<GroupId, LStr> = {
  young: L('młodych wyborców', 'young voters'),
  middle: L('wyborców w średnim wieku', 'middle-aged voters'),
  senior: L('seniorów', 'seniors'),
  city: L('mieszkańców dużych miast', 'big-city voters'),
  suburb: L('mieszkańców przedmieść', 'suburban voters'),
  rural: L('mieszkańców wsi', 'rural voters'),
  college: L('absolwentów uczelni', 'college graduates'),
  noncollege: L('wyborców bez dyplomu', 'non-college voters'),
  lowInc: L('najuboższych wyborców', 'low-income voters'),
  midInc: L('klasy średniej', 'the middle class'),
  highInc: L('najzamożniejszych', 'high earners'),
  independent: L('wyborców niezależnych', 'independents'),
};

export const GROUP_SETS: { label: LStr; ids: GroupId[] }[] = [
  { label: L('Wiek', 'Age'), ids: ['young', 'middle', 'senior'] },
  { label: L('Miejsce zamieszkania', 'Where they live'), ids: ['city', 'suburb', 'rural'] },
  { label: L('Wykształcenie', 'Education'), ids: ['college', 'noncollege'] },
  { label: L('Dochód', 'Income'), ids: ['lowInc', 'midInc', 'highInc'] },
  { label: L('Identyfikacja', 'Party identification'), ids: ['independent'] },
];

export const GROUP_IDS: GroupId[] = ['young', 'middle', 'senior', 'city', 'suburb', 'rural', 'college', 'noncollege', 'lowInc', 'midInc', 'highInc', 'independent'];

const LEAN_OFF: Record<Place | Age | Edu, number> = {
  city: -0.32,
  suburb: -0.03,
  rural: 0.3,
  young: -0.16,
  middle: 0.02,
  senior: 0.07,
  college: -0.14,
  noncollege: 0.1,
};

type IssueMap = Partial<Record<IssueId, number>>;

/** Issue priority multipliers. */
const ISSUE_MULT: Record<Place | Age | Edu | Income, IssueMap> = {
  young: { climate: 1.6, education: 1.7, social: 1.3, jobs: 1.1, healthcare: 0.75, security: 0.8, taxes: 0.8, foreign: 0.8 },
  middle: { taxes: 1.1, inflation: 1.05 },
  senior: { healthcare: 1.7, security: 1.2, inflation: 1.15, foreign: 1.2, education: 0.6, climate: 0.8 },
  city: { security: 1.2, social: 1.2, climate: 1.2, immigration: 0.9 },
  suburb: { education: 1.25, taxes: 1.15, inflation: 1.1, security: 1.1 },
  rural: { immigration: 1.2, jobs: 1.1, climate: 1.1, social: 1.15, healthcare: 1.1 },
  college: { climate: 1.25, social: 1.2, foreign: 1.1, inflation: 0.85 },
  noncollege: { inflation: 1.2, jobs: 1.2, immigration: 1.15 },
  lowInc: { inflation: 1.25, jobs: 1.2, healthcare: 1.1, taxes: 0.8 },
  midInc: {},
  highInc: { taxes: 1.35, economy: 1.15, inflation: 0.85 },
};

/** Issue opinion offsets (position points) — centred per state later. */
const IDEAL_OFF: Record<Place | Age | Edu, IssueMap> = {
  young: { social: -20, climate: -20, immigration: -10, education: -15 },
  middle: {},
  senior: { social: 10, security: 8, healthcare: -5 },
  city: { security: -10, social: -12, climate: -10 },
  suburb: { education: 4 },
  rural: { security: 15, climate: 15, social: 12, immigration: 10 },
  college: { climate: -10, social: -10, taxes: -5 },
  noncollege: { immigration: 8, jobs: -8, social: 6 },
};

const TURNOUT: Record<Place | Age | Edu, number> = { city: 0.95, suburb: 1.05, rural: 1.0, young: 0.64, middle: 1.0, senior: 1.2, college: 1.12, noncollege: 0.93 };
const TV_W: Record<Age, number> = { young: 0.5, middle: 1, senior: 1.45 };
const DIGITAL_W: Record<Age, number> = { young: 1.7, middle: 1, senior: 0.4 };
const SOCIAL_W: Record<Age, number> = { young: 2.2, middle: 0.9, senior: 0.3 };
const RALLY_W: Record<Place, number> = { city: 0.95, suburb: 1, rural: 1.15 };

export interface Segment {
  place: Place;
  age: Age;
  edu: Edu;
  weight: number; // share of the state's adults
  lean: number; // centred partisan lean
  indep: number; // share of independents
  turnout: number; // relative propensity (state mean = 1)
  idealOff: Record<IssueId, number>;
  issueMult: Record<IssueId, number>;
  income: Record<Income, number>;
  tv: number;
  digital: number;
  social: number;
  rally: number;
  /** Reporting groups this segment contributes to (income is a mix). */
  groups: [GroupId, number][];
  atanhLean: number;
}

function incomeMix(place: Place, age: Age, edu: Edu): Record<Income, number> {
  let [lo, mid, hi] = edu === 'college' ? [0.18, 0.45, 0.37] : [0.42, 0.45, 0.13];
  if (place === 'rural') [lo, hi] = [lo + 0.08, hi - 0.06];
  if (place === 'suburb') [lo, hi] = [lo - 0.06, hi + 0.06];
  if (age === 'young') [lo, hi] = [lo + 0.12, hi - 0.08];
  if (age === 'senior') lo += 0.05;
  lo = Math.max(0.03, lo);
  hi = Math.max(0.03, hi);
  const t = lo + mid + hi;
  return { lowInc: lo / t, midInc: mid / t, highInc: hi / t };
}

function buildSegments(s: StateInfo): Segment[] {
  const d = s.demo;
  let city = d.urban * d.urban * 0.55;
  if (s.code === 'DC') city = 0.85;
  const place: Record<Place, number> = { city, suburb: Math.max(0.02, d.urban - city), rural: Math.max(0.01, 1 - d.urban) };
  const senior = clamp(d.seniors / 0.78, 0.12, 0.32);
  const young = clamp(0.21 + (0.17 - d.seniors) * 0.5, 0.15, 0.3);
  const age: Record<Age, number> = { young, middle: 1 - young - senior, senior };
  const collegeMult: Record<Place, number> = { city: 1.15, suburb: 1.1, rural: 0.7 };
  const norm = (place.city * collegeMult.city + place.suburb * collegeMult.suburb + place.rural * collegeMult.rural) / (place.city + place.suburb + place.rural);

  const raw: Segment[] = [];
  for (const p of ['city', 'suburb', 'rural'] as Place[]) {
    const coll = clamp((d.college * collegeMult[p]) / norm, 0.05, 0.85);
    for (const a of ['young', 'middle', 'senior'] as Age[]) {
      for (const e of ['college', 'noncollege'] as Edu[]) {
        const weight = place[p] * age[a] * (e === 'college' ? coll : 1 - coll);
        const income = incomeMix(p, a, e);
        const issueMult = {} as Record<IssueId, number>;
        const idealOff = {} as Record<IssueId, number>;
        for (const id of ISSUE_IDS) {
          let m = (ISSUE_MULT[p][id] ?? 1) * (ISSUE_MULT[a][id] ?? 1) * (ISSUE_MULT[e][id] ?? 1);
          m *= (['lowInc', 'midInc', 'highInc'] as Income[]).reduce((acc, inc) => acc + income[inc] * (ISSUE_MULT[inc][id] ?? 1), 0);
          issueMult[id] = m;
          idealOff[id] = (IDEAL_OFF[p][id] ?? 0) + (IDEAL_OFF[a][id] ?? 0) + (IDEAL_OFF[e][id] ?? 0);
        }
        raw.push({
          place: p,
          age: a,
          edu: e,
          weight,
          lean: LEAN_OFF[p] + LEAN_OFF[a] + LEAN_OFF[e],
          indep: clamp(0.32 + (a === 'young' ? 0.12 : a === 'senior' ? -0.06 : 0) + (p === 'suburb' ? 0.04 : p === 'rural' ? -0.02 : 0), 0.15, 0.6),
          turnout: TURNOUT[p] * TURNOUT[a] * TURNOUT[e],
          idealOff,
          issueMult,
          income,
          tv: TV_W[a],
          digital: DIGITAL_W[a] * (p === 'rural' ? 0.8 : 1.05),
          social: SOCIAL_W[a],
          rally: RALLY_W[p],
          groups: [],
          atanhLean: 0,
        });
      }
    }
  }
  // Normalise weights and centre lean / opinions / turnout on the state level.
  const total = raw.reduce((a, g) => a + g.weight, 0);
  for (const g of raw) g.weight /= total;
  const meanLean = raw.reduce((a, g) => a + g.weight * g.lean, 0);
  const meanTurnout = raw.reduce((a, g) => a + g.weight * g.turnout, 0);
  const meanIdeal = {} as Record<IssueId, number>;
  for (const id of ISSUE_IDS) meanIdeal[id] = raw.reduce((a, g) => a + g.weight * g.idealOff[id], 0);
  for (const g of raw) {
    g.lean = clamp(s.lean + g.lean - meanLean, -0.92, 0.92);
    g.turnout /= meanTurnout;
    for (const id of ISSUE_IDS) g.idealOff[id] -= meanIdeal[id];
    g.atanhLean = Math.atanh(g.lean);
    g.groups = segmentGroups(g);
  }
  return raw;
}

export const SEGMENTS: Record<string, Segment[]> = Object.fromEntries(STATES.map((s) => [s.code, buildSegments(s)]));

/** Which reporting groups a segment contributes to, with weights (income is a mix). */
export function segmentGroups(g: Segment): [GroupId, number][] {
  return [
    [g.age, 1],
    [g.place, 1],
    [g.edu, 1],
    ['lowInc', g.income.lowInc],
    ['midInc', g.income.midInc],
    ['highInc', g.income.highInc],
  ];
}
