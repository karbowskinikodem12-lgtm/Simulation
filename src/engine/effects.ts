// Declarative effect language used by events and decisions. Keeping effects as data makes it
// trivial to add new events without touching the simulation core.

import { STATES, STATE_BY_CODE, stateName } from '../data/states';
import { fmt, type LStr } from '../i18n';
import type { CandidateStats, Economy, EventContext, FundSource, GameState, IssueId } from './types';
import type { Rng } from './rng';
import { clamp } from './util';
import { pushKeyEvent, pushNews } from './news';
import { NATIONAL_IDEAL } from './voterModel';
import { earn } from './actions';
import { PARTIES } from '../data/parties';

/** self = event's candidate, other = ctx.otherId, others = everyone but self, all = everyone. */
export type Target = 'self' | 'other' | 'others' | 'all';

export type Effect =
  | { k: 'fav'; t: Target; v: number }
  | { k: 'momentum'; t: Target; v: number }
  | { k: 'funds'; t: Target; v: number; src?: FundSource }
  | { k: 'enthusiasm'; t: Target; v: number }
  | { k: 'stamina'; t: Target; v: number }
  | { k: 'prep'; t: Target; v: number }
  | { k: 'position'; t: Target; issue: IssueId | 'ctx'; v: number }
  /** Move target's position toward the national median voter by fraction v. */
  | { k: 'moderate'; t: Target; issue: IssueId | 'ctx'; v: number }
  | { k: 'salience'; issue: IssueId | 'ctx'; v: number }
  | { k: 'econ'; field: keyof Omit<Economy, 'confidence'>; v: number }
  /** Local opinion shift in ctx.state (or listed states) for target. */
  | { k: 'local'; t: Target; v: number; states?: string[]; region?: boolean }
  | { k: 'chance'; p: number; yes: Effect[]; no: Effect[]; yesNews?: LStr; noNews?: LStr }
  | { k: 'key'; text: LStr; impact: number; t?: Target }
  /** Permanent change of a candidate statistic. */
  | { k: 'stat'; t: Target; stat: keyof CandidateStats; v: number }
  | { k: 'buzz'; t: Target; v: number }
  | { k: 'approval'; v: number }
  | { k: 'interest'; v: number }
  /** Move target's positions toward (and beyond) the party platform by fraction v — pleasing the base. */
  | { k: 'toBase'; t: Target; v: number };

function targets(game: GameState, ctx: EventContext, t: Target): string[] {
  const all = game.candidates.map((c) => c.id);
  switch (t) {
    case 'self':
      return ctx.candId ? [ctx.candId] : [];
    case 'other':
      return ctx.otherId ? [ctx.otherId] : [];
    case 'others':
      return all.filter((id) => id !== ctx.candId);
    case 'all':
      return all;
  }
}

/** Fill {self}, {other} and {state} placeholders in both languages. */
export function fill(text: LStr, game: GameState, ctx: EventContext): LStr {
  const name = (id?: string) => game.candidates.find((c) => c.id === id)?.name ?? '';
  return fmt(text, { self: name(ctx.candId), other: name(ctx.otherId), state: ctx.state ? stateName(ctx.state) : '' });
}

/**
 * Apply effects. `harmScale` multiplies damage (negative favourability/momentum) to the event's own
 * candidate — used to make scandals hurt scandal-prone candidates more and "teflon" ones less.
 */
export function applyEffects(game: GameState, effects: Effect[], ctx: EventContext, rng: Rng, harmScale = 1) {
  for (const e of effects) {
    switch (e.k) {
      case 'fav':
      case 'momentum':
      case 'funds':
      case 'enthusiasm':
      case 'stamina':
      case 'prep':
        for (const id of targets(game, ctx, e.t)) {
          const c = game.candidates.find((x) => x.id === id)!;
          const scale = id === ctx.candId && e.v < 0 ? harmScale : 1;
          if (e.k === 'fav') c.favorability = clamp(c.favorability + e.v * scale, -50, 50);
          if (e.k === 'momentum') c.momentum += e.v * scale;
          if (e.k === 'funds') {
            if (e.v > 0) earn(c, e.v, e.src ?? 'pac');
            else c.funds = Math.max(0, c.funds + e.v);
          }
          if (e.k === 'enthusiasm') c.enthusiasm = clamp(c.enthusiasm + e.v, 0, 100);
          if (e.k === 'stamina') c.stamina = clamp(c.stamina + e.v, 0, 100);
          if (e.k === 'prep') c.debatePrep = clamp(c.debatePrep + e.v, 0, 100);
        }
        break;
      case 'position': {
        const issue = e.issue === 'ctx' ? ctx.issue! : e.issue;
        for (const id of targets(game, ctx, e.t)) {
          const c = game.candidates.find((x) => x.id === id)!;
          c.positions[issue] = clamp(c.positions[issue] + e.v, -100, 100);
        }
        break;
      }
      case 'moderate': {
        const issue = e.issue === 'ctx' ? ctx.issue! : e.issue;
        for (const id of targets(game, ctx, e.t)) {
          const c = game.candidates.find((x) => x.id === id)!;
          c.positions[issue] = Math.round(c.positions[issue] + (NATIONAL_IDEAL[issue] - c.positions[issue]) * e.v);
        }
        break;
      }
      case 'salience': {
        const issue = e.issue === 'ctx' ? ctx.issue! : e.issue;
        game.salienceShock[issue] += e.v;
        break;
      }
      case 'econ':
        game.economy[e.field] += e.v;
        break;
      case 'local': {
        let codes = e.states ?? (ctx.state ? [ctx.state] : []);
        if (e.region && ctx.state) {
          const region = STATE_BY_CODE[ctx.state].region;
          codes = STATES.filter((s) => s.region === region).map((s) => s.code);
        }
        for (const code of codes) {
          const scale = e.region && code !== ctx.state ? 0.4 : 1;
          for (const id of targets(game, ctx, e.t)) {
            const rt = game.states[code];
            rt.eventMod[id] = (rt.eventMod[id] ?? 0) + e.v * scale;
          }
        }
        break;
      }
      case 'stat':
        for (const id of targets(game, ctx, e.t)) {
          const c = game.candidates.find((x) => x.id === id)!;
          c.stats[e.stat] = clamp(c.stats[e.stat] + e.v, 5, 99);
        }
        break;
      case 'buzz':
        for (const id of targets(game, ctx, e.t)) {
          const c = game.candidates.find((x) => x.id === id)!;
          c.social.buzz = clamp(c.social.buzz + e.v, -1, 1);
        }
        break;
      case 'toBase':
        for (const id of targets(game, ctx, e.t)) {
          const c = game.candidates.find((x) => x.id === id)!;
          const d = PARTIES[c.party].defaults;
          for (const k of Object.keys(c.positions) as IssueId[]) c.positions[k] = Math.round(clamp(c.positions[k] + (d[k] * 1.2 - c.positions[k]) * e.v, -100, 100));
        }
        break;
      case 'approval':
        game.approval = clamp(game.approval + e.v, 20, 75);
        break;
      case 'interest':
        game.interest = clamp(game.interest + e.v, 10, 100);
        break;
      case 'chance':
        if (rng.chance(e.p)) {
          applyEffects(game, e.yes, ctx, rng, harmScale);
          if (e.yesNews) pushNews(game, fill(e.yesNews, game, ctx), { tone: 'neutral', candId: ctx.candId, category: 'event' });
        } else {
          applyEffects(game, e.no, ctx, rng, harmScale);
          if (e.noNews) pushNews(game, fill(e.noNews, game, ctx), { tone: 'neutral', candId: ctx.candId, category: 'event' });
        }
        break;
      case 'key':
        pushKeyEvent(game, { text: fill(e.text, game, ctx), candId: e.t === 'other' ? ctx.otherId : ctx.candId, impact: e.impact });
        break;
    }
  }
}
