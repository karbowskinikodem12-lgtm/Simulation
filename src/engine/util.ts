import { getLang, type Lang, type LStr } from '../i18n';

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function softmax(values: number[]): number[] {
  const m = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - m));
  const total = sum(exps);
  return exps.map((e) => e / total);
}

export function mapValues<T, U>(obj: Record<string, T>, fn: (v: T, k: string) => U): Record<string, U> {
  const out: Record<string, U> = {};
  for (const k of Object.keys(obj)) out[k] = fn(obj[k], k);
  return out;
}

export function fmtPct(v: number, digits = 1) {
  return `${(v * 100).toFixed(digits)}%`;
}

export function fmtMoney(m: number, lang: Lang = getLang()) {
  if (Math.abs(m) >= 1000) return lang === 'pl' ? `$${(m / 1000).toFixed(2)} mld` : `$${(m / 1000).toFixed(2)}B`;
  const v = m.toFixed(Math.abs(m) < 10 ? 1 : 0);
  return lang === 'pl' ? `$${v} mln` : `$${v}M`;
}

export function fmtVotes(millions: number, lang: Lang = getLang()) {
  if (millions >= 1) return lang === 'pl' ? `${millions.toFixed(2)} mln` : `${millions.toFixed(2)}M`;
  return lang === 'pl' ? `${Math.round(millions * 1000)} tys.` : `${Math.round(millions * 1000)}K`;
}

/** Money in both languages (for engine-generated texts). */
export function moneyL(m: number): LStr {
  return { pl: fmtMoney(m, 'pl'), en: fmtMoney(m, 'en') };
}
