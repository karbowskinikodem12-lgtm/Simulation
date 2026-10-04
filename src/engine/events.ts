// Random campaign events: selection, targeting, AI responses and player decisions.

import { EVENT_TEMPLATES, type EventTemplate } from '../data/eventTemplates';
import { STATE_CODES } from '../data/states';
import { TUNING } from './config';
import type { EventContext, GameState } from './types';
import type { Rng } from './rng';
import { applyEffects, fill } from './effects';
import { pushKeyEvent, pushNews } from './news';
import { progress } from './voterModel';

export const TEMPLATE_BY_ID: Record<string, EventTemplate> = Object.fromEntries(EVENT_TEMPLATES.map((t) => [t.id, t]));

function eligible(game: GameState, t: EventTemplate): boolean {
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
  if (t.states) ctx.state = rng.pick([...t.states]);
  else ctx.state = rng.pick(STATE_CODES);
  if (t.target === 'candidate') {
    const cand = forcedCand ? game.candidates.find((c) => c.id === forcedCand)! : rng.weighted(game.candidates, (c) => t.targetWeight?.(c, game) ?? 1);
    ctx.candId = cand.id;
    ctx.otherId = strongestRival(game, cand.id);
  }
  return ctx;
}

function aiChoose(t: EventTemplate, rng: Rng): number {
  const idx = t.choices!.map((_, i) => i);
  return rng.weighted(idx, (i) => t.choices![i].aiWeight);
}

function resolveChoiceFor(game: GameState, t: EventTemplate, ctx: EventContext, choice: number, rng: Rng, announce: boolean) {
  const ch = t.choices![choice];
  applyEffects(game, ch.effects, ctx, rng);
  if (ch.news && announce) pushNews(game, fill(ch.news, game, ctx), { tone: ch.tone ?? 'neutral', candId: ctx.candId, category: t.category });
}

export function fireEvent(game: GameState, t: EventTemplate, ctx: EventContext, rng: Rng) {
  game.cooldowns[t.id] = t.once ? 99999 : game.day + t.cooldown;
  pushNews(game, fill(t.title, game, ctx), { tone: t.tone ?? 'neutral', candId: ctx.candId, body: fill(t.text, game, ctx), category: t.category });
  if (t.effects) applyEffects(game, t.effects, ctx, rng);
  if (t.impact && ctx.candId) pushKeyEvent(game, { text: fill(t.title, game, ctx), candId: ctx.candId, impact: t.impact });
  else if (t.target === 'world' && (t.tone === 'breaking' || t.category === 'economy')) pushKeyEvent(game, { text: fill(t.title, game, ctx), impact: 0 });

  if (!t.choices) return;
  if (t.target === 'candidate') {
    const cand = game.candidates.find((c) => c.id === ctx.candId)!;
    if (cand.isPlayer) game.pendingEvent = { templateId: t.id, ctx, day: game.day };
    else resolveChoiceFor(game, t, ctx, aiChoose(t, rng), rng, true);
  } else {
    for (const c of game.candidates) {
      const cctx = { ...ctx, candId: c.id, otherId: strongestRival(game, c.id) };
      if (c.isPlayer) game.pendingEvent = { templateId: t.id, ctx: cctx, day: game.day };
      else resolveChoiceFor(game, t, cctx, aiChoose(t, rng), rng, rng.chance(0.5));
    }
  }
}

/** Roll for today's random event. */
export function rollDailyEvent(game: GameState, rng: Rng) {
  if (game.pendingEvent) return;
  const p = progress(game);
  const chance = TUNING.dailyEventChance * (0.8 + p * 0.5);
  if (!rng.chance(chance)) return;
  const pool = EVENT_TEMPLATES.filter((t) => eligible(game, t));
  if (!pool.length) return;
  const t = rng.weighted(pool, (x) => x.weight);
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
