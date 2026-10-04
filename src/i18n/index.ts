// Internationalisation. Two languages: Polish (default) and English.
//
// - UI strings are translated at render time with `t(pl, en)` / `loc(text)`.
// - Everything the engine writes into the game state (news, events, analysis…) is stored as an
//   `LStr` holding both languages, so switching language mid-game also translates history.

export type Lang = 'pl' | 'en';
export const LANGS: Lang[] = ['pl', 'en'];

/** A localized string: the same text in both languages. */
export interface LStr {
  pl: string;
  en: string;
}

export type Text = string | LStr;

const STORAGE_KEY = 'road-to-270-lang';

function initialLang(): Lang {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (v === 'pl' || v === 'en') return v;
  } catch {
    /* storage unavailable */
  }
  return 'pl';
}

let current: Lang = initialLang();

export function getLang(): Lang {
  return current;
}

export function setLangGlobal(lang: Lang) {
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage unavailable */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

/** Build a localized string. */
export function L(pl: string, en: string): LStr {
  return { pl, en };
}

/** Same text in both languages (names, numbers). */
export function same(s: string): LStr {
  return { pl: s, en: s };
}

export function isLStr(v: unknown): v is LStr {
  return typeof v === 'object' && v !== null && 'pl' in v && 'en' in v;
}

/** Resolve a text in a given (default: current) language. Plain strings pass through. */
export function loc(text: Text | undefined | null, lang: Lang = current): string {
  if (text === undefined || text === null) return '';
  return typeof text === 'string' ? text : text[lang];
}

/** Build an LStr from a function evaluated once per language. */
export function bi(fn: (lang: Lang) => string): LStr {
  return { pl: fn('pl'), en: fn('en') };
}

/** Translate inline: t('Polski tekst', 'English text'). */
export function t(pl: string, en: string, lang: Lang = current): string {
  return lang === 'pl' ? pl : en;
}

/** Replace {placeholders} in both languages; values may themselves be localized. */
export function fmt(text: LStr, params: Record<string, Text | number>): LStr {
  return bi((lang) => {
    let s = text[lang];
    for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, typeof v === 'number' ? String(v) : loc(v, lang));
    return s;
  });
}

/** Join localized parts with a separator. */
export function join(parts: Text[], sep: Text = ', '): LStr {
  return bi((lang) => parts.map((p) => loc(p, lang)).join(loc(sep, lang)));
}

/** Wrap text in the language's quotation marks. */
export function quote(s: string, lang: Lang = current): string {
  return lang === 'pl' ? `„${s}”` : `“${s}”`;
}

export const MONTHS: Record<Lang, string[]> = {
  pl: ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export const WEEKDAYS: Record<Lang, string[]> = {
  pl: ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};
