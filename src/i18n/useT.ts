import { useGame } from '../store/gameStore';
import { loc as locIn, quote, type Lang, type Text } from './index';

/**
 * React hook for translations. Subscribing to the store's language makes the component
 * re-render instantly when the player switches language.
 */
export function useT() {
  const lang = useGame((s) => s.lang);
  return {
    lang,
    t: (pl: string, en: string) => (lang === 'pl' ? pl : en),
    loc: (text: Text | undefined | null) => locIn(text, lang),
    q: (s: string) => quote(s, lang),
  };
}

export type { Lang };
