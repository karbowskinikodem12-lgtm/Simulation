// Derived view data shared by several screens.

import { STATES, STATE_BY_CODE } from '../data/states';
import { TUNING } from '../engine/config';
import type { GameState } from '../engine/types';
import type { Snapshot } from '../engine/voterModel';
import { leaderOf } from '../engine/voterModel';
import { NEUTRAL, heatFill, marginFill, mix } from './colors';
import type { MapMode } from '../store/gameStore';
import { dateForDay } from '../engine/setup';
import { getLang, MONTHS, WEEKDAYS, type Lang } from '../i18n';

export function candColor(game: GameState, id: string) {
  return game.candidates.find((c) => c.id === id)?.color ?? '#888';
}

export function effortStock(game: GameState, code: string, candId: string) {
  const rt = game.states[code];
  return (rt.presence[candId] ?? 0) + (rt.ads[candId] ?? 0) + (rt.offices[candId] ?? 0) * TUNING.officePresence;
}

export function mapFills(game: GameState, snap: Snapshot, mode: MapMode): Record<string, string> {
  const fills: Record<string, string> = {};
  const focus = game.playerId ?? game.candidates[0].id;
  const n = game.candidates.length;
  for (const s of STATES) {
    if (mode === 'projection') {
      const l = leaderOf(snap.states[s.code].estimate);
      fills[s.code] = marginFill(candColor(game, l.id), l.margin);
    } else if (mode === 'winprob') {
      const probs = game.forecast?.stateWinProb[s.code] ?? {};
      const [id, p] = Object.entries(probs).sort((a, b) => b[1] - a[1])[0] ?? [focus, 0.5];
      const t = Math.max(0, (p - 1 / n) / (1 - 1 / n));
      fills[s.code] = mix(NEUTRAL, candColor(game, id), 0.15 + 0.85 * t);
    } else if (mode === 'presence') {
      fills[s.code] = heatFill(candColor(game, focus), Math.log1p(effortStock(game, s.code, focus)) / 2.2);
    } else {
      const lean = STATE_BY_CODE[s.code].lean;
      fills[s.code] = marginFill(lean > 0 ? '#ef4444' : '#3b82f6', lean);
    }
  }
  return fills;
}

export function dayLabel(game: GameState, day: number, withWeekday = false, lang: Lang = getLang()) {
  const d = dateForDay(game, day);
  const m = MONTHS[lang][d.getUTCMonth()];
  const base = lang === 'pl' ? `${d.getUTCDate()} ${m}` : `${m} ${d.getUTCDate()}`;
  if (!withWeekday) return base;
  return lang === 'pl' ? `${WEEKDAYS.pl[d.getUTCDay()]} ${base} ${d.getUTCFullYear()}` : `${WEEKDAYS.en[d.getUTCDay()]}, ${base}, ${d.getUTCFullYear()}`;
}

/** National estimate change over the last `days` days (percentage points). */
export function nationalDelta(game: GameState, candId: string, days = 7) {
  const h = game.history;
  if (h.length < 2) return 0;
  const now = h[h.length - 1];
  const then = h[Math.max(0, h.length - 1 - days)];
  return (now.national[candId] - then.national[candId]) * 100 * (1 - now.undecided);
}

/** Battleground list: closest states by estimated margin, weighted by EV. */
export function battlegrounds(snap: Snapshot, limit = 12) {
  return STATES.map((s) => ({ s, l: leaderOf(snap.states[s.code].estimate) }))
    .filter((x) => x.l.margin < 0.08)
    .sort((a, b) => a.l.margin - b.l.margin || b.s.ev - a.s.ev)
    .slice(0, limit);
}
