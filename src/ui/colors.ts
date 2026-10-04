// Color helpers for map shading and candidate theming.

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

export function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export const NEUTRAL = '#2a3550';

export type Rating = 'tossup' | 'lean' | 'likely' | 'safe';

export function ratingOf(margin: number): Rating {
  const m = Math.abs(margin);
  if (m < 0.02) return 'tossup';
  if (m < 0.06) return 'lean';
  if (m < 0.12) return 'likely';
  return 'safe';
}

export const RATING_LABEL: Record<Rating, string> = {
  tossup: 'Remis',
  lean: 'Przechylony',
  likely: 'Prawdopodobny',
  safe: 'Pewny',
};

const RATING_MIX: Record<Rating, number> = { tossup: 0.28, lean: 0.52, likely: 0.76, safe: 1 };

/** Fill for a state led by `color` with a given margin. */
export function marginFill(color: string, margin: number): string {
  return mix(NEUTRAL, color, RATING_MIX[ratingOf(margin)]);
}

export function heatFill(color: string, t: number): string {
  return mix('#1a2338', color, Math.max(0, Math.min(1, t)));
}

export const RATING_COLORS: Record<'safeD' | 'likelyD' | 'leanD' | 'tossup' | 'leanR' | 'likelyR' | 'safeR', string> = {
  safeD: '#1d4ed8',
  likelyD: '#3b82f6',
  leanD: '#7aa7f5',
  tossup: '#8b7d3c',
  leanR: '#f08b8b',
  likelyR: '#ef4444',
  safeR: '#b91c1c',
};
