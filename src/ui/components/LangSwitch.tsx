import { useGame } from '../../store/gameStore';
import { LANGS } from '../../i18n';

const LABEL = { pl: 'PL', en: 'EN' } as const;
const TITLE = { pl: 'Polski', en: 'English' } as const;

/** Compact PL / EN language switcher. The choice is remembered between sessions. */
export function LangSwitch({ compact = false }: { compact?: boolean }) {
  const lang = useGame((s) => s.lang);
  const setLang = useGame((s) => s.setLang);
  return (
    <div className={`lang-switch${compact ? ' compact' : ''}`} role="group" aria-label="Język / Language">
      {LANGS.map((l) => (
        <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)} title={TITLE[l]} aria-pressed={lang === l}>
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
