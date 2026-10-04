import type { GameState, KeyEvent, NewsItem, NewsTone, Severity } from './types';
import type { LStr } from '../i18n';

export function nextId(game: GameState, prefix: string): string {
  game.idCounter += 1;
  return `${prefix}${game.idCounter}`;
}

/** Publish a news item. Texts are bilingual so the feed follows the selected UI language. */
export function pushNews(
  game: GameState,
  headline: LStr,
  opts: { tone?: NewsTone; candId?: string; body?: LStr; category?: string; severity?: Severity } = {},
): NewsItem {
  const item: NewsItem = {
    id: nextId(game, 'n'),
    day: game.day,
    headline,
    body: opts.body,
    tone: opts.tone ?? 'neutral',
    candId: opts.candId,
    category: opts.category ?? 'campaign',
    severity: opts.severity ?? (opts.tone === 'breaking' ? 'major' : 'minor'),
  };
  game.news.unshift(item);
  if (game.news.length > 220) game.news.length = 220;
  return item;
}

export function pushKeyEvent(game: GameState, ev: Omit<KeyEvent, 'day'>) {
  game.keyEvents.push({ ...ev, day: game.day });
}

export function candName(game: GameState, id?: string): string {
  return game.candidates.find((c) => c.id === id)?.name ?? '—';
}
