// "AI" platform writer: builds a coherent program (positions + texts + slogan) from a party,
// a candidate profile and a style. Also infers positions from free text typed by the player.

import { PARTIES } from '../data/parties';
import { PROFILES } from '../data/profiles';
import { ISSUES, ISSUE_IDS, ISSUE_BY_ID } from '../data/issues';
import { LEXICON, ISSUE_MENTION, PLATFORM_PHRASES, SLOGANS } from '../data/platformText';
import type { IssueId, PartyId, Positions, ProfileId } from './types';
import { createRng, type Rng } from './rng';
import { clamp } from './util';
import { bi, getLang, L, loc, type Lang, type LStr } from '../i18n';

export type PlatformStyle = 'moderate' | 'mainstream' | 'radical';

export const STYLE_LABEL: Record<PlatformStyle, LStr> = {
  moderate: L('Umiarkowany', 'Moderate'),
  mainstream: L('Główny nurt', 'Mainstream'),
  radical: L('Radykalny', 'Radical'),
};

const STYLE_SCALE: Record<PlatformStyle, number> = { moderate: 0.5, mainstream: 1, radical: 1.4 };

const PROFILE_TILT: Partial<Record<ProfileId, Partial<Positions>>> = {
  general: { security: 18, foreign: 20 },
  business: { economy: 15, taxes: 12, jobs: 10 },
  mayor: { security: -5, education: -8 },
  activist: { social: -10, climate: -10 },
  governor: { economy: 5 },
};

export interface GeneratedPlatform {
  positions: Positions;
  platform: Record<IssueId, string>;
  manifesto: string;
  slogan: string;
}

export function bucketOf(v: number): 0 | 1 | 2 | 3 | 4 {
  if (v <= -60) return 0;
  if (v <= -18) return 1;
  if (v < 18) return 2;
  if (v < 60) return 3;
  return 4;
}

export function platformLine(issue: IssueId, v: number, rng: Rng, lang: Lang = getLang()): string {
  return rng.pick(PLATFORM_PHRASES[lang][issue][bucketOf(v)]);
}

/** Generate a platform; texts are written in `lang` (they become the candidate's own words). */
export function generatePlatform(party: PartyId, profile: ProfileId, style: PlatformStyle, seed: number, lang: Lang = getLang()): GeneratedPlatform {
  const rng = createRng(seed);
  const def = PARTIES[party];
  const tilt = PROFILE_TILT[profile] ?? {};
  const scale = STYLE_SCALE[style];
  const positions = {} as Positions;
  for (const id of ISSUE_IDS) {
    // Independents spread around the centre more widely so each one feels distinct.
    const jitter = party === 'IND' ? rng.normal(0, 28) : rng.normal(0, 9);
    const v = def.defaults[id] * scale + (tilt[id] ?? 0) + jitter;
    positions[id] = Math.round(clamp(v, -100, 100));
  }
  const platform = {} as Record<IssueId, string>;
  for (const id of ISSUE_IDS) platform[id] = platformLine(id, positions[id], rng, lang);

  // Signature issues: the ones furthest from the centre, which the candidate will campaign on.
  const signature = [...ISSUES].sort((a, b) => Math.abs(positions[b.id]) * b.baseSalience - Math.abs(positions[a.id]) * a.baseSalience).slice(0, 3);
  const priorities = signature.map((s) => loc(s.label, lang).toLowerCase()).join(', ');
  const manifesto = [loc(PROFILES[profile].flavor, lang), lang === 'pl' ? `Moje priorytety to ${priorities}.` : `My priorities are ${priorities}.`, ...signature.map((s) => platform[s.id])].join(' ');

  const avg = ISSUE_IDS.reduce((a, id) => a + positions[id], 0) / ISSUE_IDS.length;
  const bank = SLOGANS[lang];
  const slogan = rng.pick(avg < -20 ? bank.left : avg > 20 ? bank.right : bank.center);

  return { positions, platform, manifesto, slogan };
}

export interface TextAnalysis {
  positions: Positions;
  detected: { issue: IssueId; value: number; mentioned: boolean }[];
}

/**
 * Keyword-based reading of the player's own program. Explicit stances move the slider strongly,
 * a bare mention just keeps the current value. Per-issue texts take priority over the manifesto.
 */
export function analyzeProgramText(manifesto: string, perIssue: Partial<Record<IssueId, string>>, base: Positions): TextAnalysis {
  const positions = { ...base };
  const detected: TextAnalysis['detected'] = [];
  const whole = manifesto.toLowerCase();
  for (const id of ISSUE_IDS) {
    const own = (perIssue[id] ?? '').toLowerCase();
    // The manifesto is what the player just wrote, so it wins; per-issue notes are a fallback.
    let scores = LEXICON[id].filter(({ re }) => re.test(whole)).map(({ dir }) => dir);
    if (!scores.length && own) scores = LEXICON[id].filter(({ re }) => re.test(own)).map(({ dir }) => dir);
    if (scores.length) {
      const v = Math.round(clamp(scores.reduce((a, b) => a + b, 0) / scores.length, -100, 100));
      positions[id] = Math.round(base[id] * 0.25 + v * 0.75);
      if (Math.abs(positions[id] - base[id]) >= 5 || LEXICON[id].some(({ re }) => re.test(whole))) detected.push({ issue: id, value: positions[id], mentioned: true });
    } else if (ISSUE_MENTION[id].test(own) || ISSUE_MENTION[id].test(whole)) {
      detected.push({ issue: id, value: positions[id], mentioned: false });
    }
  }
  return { positions, detected };
}

export function describeStance(issue: IssueId, v: number): LStr {
  const d = ISSUE_BY_ID[issue];
  if (Math.abs(v) < 12) return bi((l) => `${loc(d.label, l)}: ${l === 'pl' ? 'pozycja centrowa' : 'centrist position'}`);
  return bi((l) => `${loc(d.label, l)}: ${loc(v < 0 ? d.left : d.right, l)}`);
}
