// Deterministic RNG (mulberry32). State lives in GameState.rng so saved games replay identically.

export interface Rng {
  next(): number;
  range(min: number, max: number): number;
  int(min: number, maxInclusive: number): number;
  chance(p: number): boolean;
  normal(mean?: number, sd?: number): number;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly T[], weight: (t: T) => number): T;
  state(): number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    chance: (p) => next() < p,
    normal: (mean = 0, sd = 1) => {
      const u = Math.max(next(), 1e-12);
      const v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    pick: (items) => items[Math.floor(next() * items.length)],
    weighted: (items, weight) => {
      const ws = items.map((i) => Math.max(0, weight(i)));
      const total = ws.reduce((a, b) => a + b, 0);
      if (total <= 0) return items[Math.floor(next() * items.length)];
      let r = next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= ws[i];
        if (r <= 0) return items[i];
      }
      return items[items.length - 1];
    },
    state: () => s,
  };
  return rng;
}

/** Run `fn` with an RNG bound to the game's stored state and persist the advanced state. */
export function withRng<T>(game: { rng: number }, fn: (rng: Rng) => T): T {
  const rng = createRng(game.rng);
  const out = fn(rng);
  game.rng = rng.state();
  return out;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
