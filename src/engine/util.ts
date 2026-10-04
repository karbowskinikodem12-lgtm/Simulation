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

export function fmtMoney(m: number) {
  if (Math.abs(m) >= 1000) return `$${(m / 1000).toFixed(2)} mld`;
  return `$${m.toFixed(m < 10 ? 1 : 0)} mln`;
}

export function fmtVotes(millions: number) {
  if (millions >= 1) return `${millions.toFixed(2)} mln`;
  return `${Math.round(millions * 1000)} tys.`;
}
