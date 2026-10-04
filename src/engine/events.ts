// Campaign events: selection, targeting, AI responses and player decisions.
// Two daily rolls: frequent minor news, and rarer moderate/major events. Calendar events
// (running mate, primaries, conventions) are fired by the timeline instead.

import { EVENT_TEMPLATES, type EventTemplate } from '../data/eventTemplates';
import { STATE_CODES } from '../data/states';
import { TUNING } from './config';
import type { Candidate, EventContext, GameState } from './types';
import type { Rng } from './rng';
import { applyEffects, fill } from './effects';
import { pushKeyEvent, pushNews } from './news';
import { progress } from './voterModel';

export const TEMPLATE_BY_ID: Record<string, EventTemplate> = Object.fromEntries(EVENT_TEMPLATES.map((t) => [t.id, t]));

export function tierOf(t: EventTemplate) {
  return t.tier ?? 'moderate';
}

function eligible(game: GameState, t: EventTemplate): boolean {
  if (t.scheduled) return false;
  const p = progress(game);
  if (t.minProgress !== undefined && p < t.minProgress) return false;
  if (t.maxProgress !== undefined && p > t.maxProgress) return false;
  if ((game.cooldowns[t.id] ?? -1) > game.day) return false;
  if (t.condition && !t.condition(game)) return false;
  return true;
}

function strongestRival(game: GameState, candId: string): string | undefined {
  const last = game.history[game.history.length - 1];
  const others = game.candidates.filter((c) => c.id !== candId);
  if (!others.length) return undefined;
  return [...others].sort((a, b) => (last?.national[b.id] ?? 0) - (last?.national[a.id] ?? 0))[0].id;
}

export function buildContext(game: GameState, t: EventTemplate, rng: Rng, forcedCand?: string): EventContext {
  const ctx: EventContext = { issue: t.issue };
  if (t.target === 'candidate') {
    const cand = forcedCand ? game.candidates.find((c) => c.id === forcedCand)! : rng.weighted(game.candidates, (c) => t.targetWeight?.(c, game) ?? 1);
    ctx.candId = cand.id;
    ctx.otherId = strongestRival(game, cand.id);
  }
  if (t.stateFor && ctx.candId) ctx.state = t.stateFor(game, ctx.candId);
  else if (t.states) ctx.state = rng.pick([...t.states]);
  else ctx.state = rng.pick(STATE_CODES);
  return ctx;
}

/** Scandals hurt scandal-prone candidates more and "teflon" candidates less. */
function harmScale(t: EventTemplate, c?: Candidate) {
  if (!c || (t.category !== 'scandal' && t.category !== 'media')) return 1;
  return 0.6 + (c.stats.scandalRisk / 100) * 0.8;
}

function aiChoose(t: EventTemplate, rng: Rng): number {
  const idx = t.choices!.map((_, i) => i);
  return rng.weighted(idx, (i) => t.choices![i].aiWeight);
}

function resolveChoiceFor(game: GameState, t: EventTemplate, ctx: EventContext, choice: number, rng: Rng, announce: boolean) {
  const ch = t.choices![choice];
  const c = game.candidates.find((x) => x.id === ctx.candId);
  applyEffects(game, ch.effects, ctx, rng, harmScale(t, c));
  if (ch.news && announce) pushNews(game, fill(ch.news, game, ctx), { tone: ch.tone ?? 'neutral', candId: ctx.candId, category: t.category, severity: tierOf(t) === 'major' ? 'moderate' : 'minor' });
}

export function fireEvent(game: GameState, t: EventTemplate, ctx: EventContext, rng: Rng) {
  if (!t.scheduled) game.cooldowns[t.id] = t.once ? 99999 : game.day + t.cooldown;
  const tier = tierOf(t);
  const c = game.candidates.find((x) => x.id === ctx.candId);
  if (t.category === 'scandal' && c) c.totals.scandals += 1;
  pushNews(game, fill(t.title, game, ctx), { tone: t.tone ?? 'neutral', candId: ctx.candId, body: fill(t.text, game, ctx), category: t.category, severity: tier });
  if (tier === 'major') game.interest = Math.min(100, game.interest + 1.5);
  if (t.effects) applyEffects(game, t.effects, ctx, rng, harmScale(t, c));
  if (t.impact && ctx.candId) pushKeyEvent(game, { text: fill(t.title, game, ctx), candId: ctx.candId, impact: t.impact });
  else if (t.target === 'world' && tier === 'major') pushKeyEvent(game, { text: fill(t.title, game, ctx), impact: 0 });

  if (!t.choices) return;
  if (t.target === 'candidate') {
    if (c!.isPlayer) game.pendingEvent = { templateId: t.id, ctx, day: game.day };
    else resolveChoiceFor(game, t, ctx, aiChoose(t, rng), rng, true);
  } else {
    for (const cand of game.candidates) {
      const cctx = { ...ctx, candId: cand.id, otherId: strongestRival(game, cand.id) };
      if (cand.isPlayer) game.pendingEvent = { templateId: t.id, ctx: cctx, day: game.day };
      else resolveChoiceFor(game, t, cctx, aiChoose(t, rng), rng, rng.chance(0.5));
    }
  }
}

/** Fire a calendar event for a specific candidate (running mate, primaries, convention). */
export function fireScheduled(game: GameState, templateId: string, candId: string, rng: Rng) {
  const t = TEMPLATE_BY_ID[templateId];
  fireEvent(game, t, buildContext(game, t, rng, candId), rng);
}

/** Roll for today's random events: frequent minor news plus a rarer significant event. */
export function rollDailyEvent(game: GameState, rng: Rng) {
  if (game.pendingEvent) return;
  const pool = EVENT_TEMPLATES.filter((t) => eligible(game, t));
  const minor = pool.filter((t) => tierOf(t) === 'minor');
  if (minor.length && rng.chance(0.45)) {
    const t = rng.weighted(minor, (x) => x.weight);
    fireEvent(game, t, buildContext(game, t, rng), rng);
  }
  if (game.pendingEvent) return;
  const p = progress(game);
  if (!rng.chance(TUNING.dailyEventChance * (0.75 + p * 0.5))) return;
  const big = pool.filter((t) => tierOf(t) !== 'minor' && (game.cooldowns[t.id] ?? -1) <= game.day);
  if (!big.length) return;
  const t = rng.weighted(big, (x) => x.weight * (tierOf(x) === 'major' ? 0.35 : 1));
  fireEvent(game, t, buildContext(game, t, rng), rng);
}

/** Player resolves a pending decision. */
export function resolvePendingEvent(game: GameState, choice: number, rng: Rng) {
  const pe = game.pendingEvent;
  if (!pe) return;
  const t = TEMPLATE_BY_ID[pe.templateId];
  resolveChoiceFor(game, t, pe.ctx, choice, rng, true);
  game.pendingEvent = null;
}
