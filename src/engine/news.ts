import type { GameState, KeyEvent, NewsItem, NewsTone, Severity } from './types';

export function nextId(game: GameState, prefix: string): string {
  game.idCounter += 1;
  return `${prefix}${game.idCounter}`;
}

export function pushNews(
  game: GameState,
  headline: string,
  opts: { tone?: NewsTone; candId?: string; body?: string; category?: string; severity?: Severity } = {},
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
