import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../../store/gameStore';
import type { CandidateSetup, Difficulty, PartyId, ProfileId } from '../../engine/types';
import { PARTIES, PARTY_LIST } from '../../data/parties';
import { PROFILES, PROFILE_LIST, STAT_LABEL, TRAIT_META, VISIBLE_STATS, deriveTraits } from '../../data/profiles';
import { STATES, stateName } from '../../data/states';
import { ISSUES } from '../../data/issues';
import { generatePlatform, STYLE_LABEL, type PlatformStyle } from '../../engine/platform';
import { createGame, rollStats } from '../../engine/setup';
import { computeSnapshot } from '../../engine/voterModel';
import { randomSeed } from '../../engine/rng';
import { Avatar, StatBar } from '../components/common';
import { USMap } from '../map/USMap';
import { EVBar } from '../charts/EVBar';
import { marginFill } from '../colors';
import { ProgramEditor } from '../modals/ProgramEditor';
import { LangSwitch } from '../components/LangSwitch';
import { getLang, L, type Lang, type LStr } from '../../i18n';
import { useT } from '../../i18n/useT';

const DEFAULTS: { name: string; party: PartyId; profile: ProfileId; home: string }[] = [
  { name: 'Alexandra Reed', party: 'DEM', profile: 'governor', home: 'MI' },
  { name: 'Thomas Whitfield', party: 'REP', profile: 'senator', home: 'OH' },
  { name: 'Morgan Blake', party: 'IND', profile: 'business', home: 'CO' },
];

function freshCandidate(i: number, seed: number, lang: Lang): CandidateSetup {
  const d = DEFAULTS[i];
  const p = generatePlatform(d.party, d.profile, 'mainstream', seed, lang);
  return { name: d.name, party: d.party, profile: d.profile, homeState: d.home, ...p, stats: rollStats(d.profile, randomSeed()) };
}

const LENGTHS: { days: number; label: LStr }[] = [
  { days: 45, label: L('Krótka', 'Short') },
  { days: 60, label: L('Standard', 'Standard') },
  { days: 90, label: L('Długa', 'Long') },
];

const DIFFS: { id: Difficulty; label: LStr }[] = [
  { id: 'easy', label: L('Łatwy', 'Easy') },
  { id: 'normal', label: L('Normalny', 'Normal') },
  { id: 'hard', label: L('Trudny', 'Hard') },
];

export function SetupScreen() {
  const { setScreen, newGame } = useGame();
  const { t, loc, lang, q } = useT();
  const [count, setCount] = useState<2 | 3>(2);
  // Seed of each candidate's generated platform; null once the player wrote their own texts.
  const [textSeeds, setTextSeeds] = useState<(number | null)[]>(() => [0, 1, 2].map(() => randomSeed()));
  const [cands, setCands] = useState<CandidateSetup[]>(() => [0, 1, 2].map((i) => freshCandidate(i, textSeeds[i]!, getLang())));
  const [styles, setStyles] = useState<PlatformStyle[]>(['mainstream', 'mainstream', 'mainstream']);
  const [days, setDays] = useState(60);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [incumbent, setIncumbent] = useState<PartyId | 'none'>('DEM');
  const [playerIndex, setPlayerIndex] = useState<number | null>(0);
  const [editing, setEditing] = useState<number | null>(null);
  const [seed] = useState(() => randomSeed());

  const active = cands.slice(0, count);
  const update = (i: number, patch: Partial<CandidateSetup>) => setCands((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const regenerate = (i: number, style = styles[i], party = cands[i].party, profile = cands[i].profile) => {
    const seed = randomSeed();
    const p = generatePlatform(party, profile, style, seed, lang);
    setTextSeeds((ss) => ss.map((x, j) => (j === i ? seed : x)));
    update(i, { party, profile, ...p });
  };

  // Switching language re-writes AI-generated platforms in the new language. The same seed yields
  // the same positions, so only the texts change; programs the player wrote are left untouched.
  const shownLang = useRef(lang);
  useEffect(() => {
    if (shownLang.current === lang) return;
    shownLang.current = lang;
    setCands((cs) =>
      cs.map((c, i) => {
        const seed = textSeeds[i];
        if (seed === null) return c;
        const p = generatePlatform(c.party, c.profile, styles[i], seed, lang);
        return { ...c, platform: p.platform, manifesto: p.manifesto, slogan: p.slogan };
      }),
    );
  }, [lang, textSeeds, styles]);

  const parties = Array.from(new Set(active.map((c) => c.party)));
  const incumbentParty = incumbent !== 'none' && parties.includes(incumbent) ? incumbent : null;
  const settings = { totalDays: days, difficulty, incumbentParty, playerIndex: playerIndex !== null && playerIndex < count ? playerIndex : null, seed };

  const preview = useMemo(() => {
    const g = createGame(active, { ...settings, seed: 12345 });
    const snap = computeSnapshot(g);
    const fills: Record<string, string> = {};
    for (const s of STATES) {
      const est = snap.states[s.code].estimate;
      const sorted = Object.entries(est).sort((a, b) => b[1] - a[1]);
      fills[s.code] = marginFill(g.candidates.find((c) => c.id === sorted[0][0])!.color, sorted[0][1] - sorted[1][1]);
    }
    return { g, snap, fills };
  }, [JSON.stringify(active.map((c) => ({ ...c, name: '' }))), days, incumbentParty]);

  const start = () => newGame(active, settings);

  return (
    <div className="setup-screen">
      <header className="setup-header">
        <button className="btn ghost" onClick={() => setScreen('menu')}>
          ← {t('Menu', 'Menu')}
        </button>
        <div className="display" style={{ fontSize: 26, fontWeight: 800 }}>
          {t('Nowe wybory', 'New election')}
        </div>
        <div className="grow" />
        <LangSwitch />
        <button className="btn primary lg" onClick={start}>
          {t('Rozpocznij kampanię →', 'Start the campaign →')}
        </button>
      </header>

      <div className="setup-body">
        <aside className="panel setup-settings">
          <div className="section col">
            <div className="panel-title">{t('Liczba kandydatów', 'Number of candidates')}</div>
            <div className="segmented">
              {[2, 3].map((n) => (
                <button key={n} className={count === n ? 'on' : ''} onClick={() => setCount(n as 2 | 3)}>
                  {n} {t('kandydatów', 'candidates')}
                </button>
              ))}
            </div>
          </div>
          <div className="section col">
            <div className="panel-title">{t('Tryb gry', 'Game mode')}</div>
            <select className="select" value={playerIndex === null ? 'spect' : String(playerIndex)} onChange={(e) => setPlayerIndex(e.target.value === 'spect' ? null : Number(e.target.value))}>
              {active.map((c, i) => (
                <option key={i} value={i}>
                  {t('Gram jako', 'Play as')}: {c.name || `${t('Kandydat', 'Candidate')} ${i + 1}`}
                </option>
              ))}
              <option value="spect">{t('Obserwator (symulacja AI vs AI)', 'Spectator (AI vs AI simulation)')}</option>
            </select>
          </div>
          <div className="section col">
            <div className="panel-title">{t('Długość kampanii', 'Campaign length')}</div>
            <div className="segmented">
              {LENGTHS.map((l) => (
                <button key={l.days} className={days === l.days ? 'on' : ''} onClick={() => setDays(l.days)}>
                  {loc(l.label)} · {l.days} {t('dni', 'days')}
                </button>
              ))}
            </div>
          </div>
          <div className="section col">
            <div className="panel-title">{t('Poziom trudności', 'Difficulty')}</div>
            <div className="segmented">
              {DIFFS.map((d) => (
                <button key={d.id} className={difficulty === d.id ? 'on' : ''} onClick={() => setDifficulty(d.id)}>
                  {loc(d.label)}
                </button>
              ))}
            </div>
          </div>
          <div className="section col">
            <div className="panel-title">{t('Partia rządząca', 'Governing party')}</div>
            <select className="select" value={incumbentParty ?? 'none'} onChange={(e) => setIncumbent(e.target.value as PartyId | 'none')}>
              <option value="none">{t('Brak (otwarte wybory)', 'None (open election)')}</option>
              {parties.map((p) => (
                <option key={p} value={p}>
                  {loc(PARTIES[p].name)}
                </option>
              ))}
            </select>
            <div className="tiny muted">{t('Kandydat partii rządzącej jest nagradzany lub karany za stan gospodarki.', 'The governing party’s candidate is rewarded or punished for the state of the economy.')}</div>
          </div>
          <div className="section col">
            <div className="panel-title">{t('Prognoza startowa', 'Starting forecast')}</div>
            <div className="setup-minimap">
              <USMap fills={preview.fills} showLabels={false} />
            </div>
            <EVBar candidates={preview.g.candidates} ev={preview.snap.projectedEv} height={14} />
            <div className="col" style={{ gap: 4 }}>
              {preview.g.candidates.map((c) => (
                <div key={c.id} className="spread small">
                  <span style={{ color: c.color }}>{c.name}</span>
                  <span className="mono">
                    {(preview.snap.national[c.id] * 100).toFixed(1)}% · {t('szansa', 'chance')} {Math.round((preview.g.forecast?.winProb[c.id] ?? 0) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="setup-cards" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
          {active.map((c, i) => {
            const party = PARTIES[c.party];
            const color = preview.g.candidates[i].color;
            const prof = PROFILES[c.profile];
            const signature = [...ISSUES].sort((a, b) => Math.abs(c.positions[b.id]) * b.baseSalience - Math.abs(c.positions[a.id]) * a.baseSalience).slice(0, 4);
            return (
              <div key={i} className="panel cand-card" style={{ borderTopColor: color }}>
                <div className="cand-card-head" style={{ background: `linear-gradient(135deg, ${color}33, transparent 70%)` }}>
                  <Avatar name={c.name || '?'} color={color} size={58} />
                  <div className="grow col" style={{ gap: 6 }}>
                    <input className="input cand-name" value={c.name} placeholder={t('Imię i nazwisko', 'Full name')} maxLength={32} onChange={(e) => update(i, { name: e.target.value })} />
                    <div className="row tiny">
                      {playerIndex === i ? <span className="chip" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>★ {t('TWÓJ KANDYDAT', 'YOUR CANDIDATE')}</span> : <span className="chip">AI</span>}
                      <span className="muted ellipsis">{q(c.slogan)}</span>
                    </div>
                  </div>
                </div>
                <div className="section col">
                  <div className="panel-title">{t('Partia', 'Party')}</div>
                  <div className="party-grid">
                    {PARTY_LIST.map((p) => (
                      <button key={p.id} className={`party-btn${c.party === p.id ? ' on' : ''}`} style={{ ['--pc' as string]: p.color }} onClick={() => regenerate(i, styles[i], p.id)} title={loc(p.description)}>
                        <span className="dot" />
                        {loc(p.short)}
                      </button>
                    ))}
                  </div>
                  <div className="tiny muted">{loc(party.description)}</div>
                </div>
                <div className="section">
                  <div className="row" style={{ gap: 10 }}>
                    <label className="field grow">
                      {t('Profil', 'Profile')}
                      <select className="select" value={c.profile} onChange={(e) => update(i, { profile: e.target.value as ProfileId, stats: rollStats(e.target.value as ProfileId, randomSeed()) })}>
                        {PROFILE_LIST.map((p) => (
                          <option key={p.id} value={p.id}>
                            {loc(p.label)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field grow">
                      {t('Stan rodzinny', 'Home state')}
                      <select className="select" value={c.homeState} onChange={(e) => update(i, { homeState: e.target.value })}>
                        {STATES.filter((s) => s.code !== 'DC').map((s) => (
                          <option key={s.code} value={s.code}>
                            {loc(stateName(s.code))}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="tiny muted" style={{ marginTop: 6 }}>
                    {loc(prof.description)}
                  </div>
                  <div className="stat-grid">
                    {VISIBLE_STATS.map((k) => (
                      <StatBar key={k} label={loc(STAT_LABEL[k])} value={(c.stats ?? prof.stats)[k]} color={color} />
                    ))}
                    <div className="col" style={{ gap: 3 }}>
                      <div className="spread tiny">
                        <span className="muted">{t('Skandale', 'Scandals')}</span>
                        <span className="mono">?</span>
                      </div>
                      <div className="tiny muted">{t('ukryte', 'hidden')}</div>
                    </div>
                  </div>
                  <div className="row wrap" style={{ gap: 4, marginTop: 8 }}>
                    {deriveTraits(c.stats ?? prof.stats).map((tr) => (
                      <span key={tr} className={`chip trait ${TRAIT_META[tr].good ? 'good' : 'bad'}`} title={loc(TRAIT_META[tr].desc)}>
                        {TRAIT_META[tr].icon} {loc(TRAIT_META[tr].label)}
                      </span>
                    ))}
                    <button className="btn sm ghost" style={{ marginLeft: 'auto' }} onClick={() => update(i, { stats: rollStats(c.profile, randomSeed()) })} title={t('Każdy kandydat ma indywidualne statystyki wokół profilu', 'Every candidate has individual stats around the profile')}>
                      🎲 {t('Losuj cechy', 'Reroll traits')}
                    </button>
                  </div>
                </div>
                <div className="section col grow">
                  <div className="panel-title">
                    {t('Program', 'Platform')}
                    <button className="btn sm" onClick={() => setEditing(i)}>
                      ✎ {t('Edytuj / wpisz własny', 'Edit / write your own')}
                    </button>
                  </div>
                  <div className="col" style={{ gap: 6 }}>
                    {signature.map((iss) => {
                      const v = c.positions[iss.id];
                      return (
                        <div key={iss.id} className="stance-row">
                          <span className="small">
                            {iss.icon} {loc(iss.label)}
                          </span>
                          <div className="stance-track">
                            <div className="stance-dot" style={{ left: `${(v + 100) / 2}%` }} />
                          </div>
                          <div className="tiny text-2 stance-text">{c.platform[iss.id]}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="row" style={{ marginTop: 'auto', paddingTop: 8 }}>
                    <div className="segmented">
                      {(Object.keys(STYLE_LABEL) as PlatformStyle[]).map((s) => (
                        <button
                          key={s}
                          className={styles[i] === s ? 'on' : ''}
                          onClick={() => {
                            setStyles((st) => st.map((x, j) => (j === i ? s : x)));
                            regenerate(i, s);
                          }}
                        >
                          {loc(STYLE_LABEL[s])}
                        </button>
                      ))}
                    </div>
                    <button className="btn sm grow" onClick={() => regenerate(i)}>
                      🤖 {t('Generuj program AI', 'Generate AI platform')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </main>
      </div>

      {editing !== null && (
        <ProgramEditor
          candidate={cands[editing]}
          title={`${cands[editing].name} — ${loc(stateName(cands[editing].homeState))}`}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            update(editing, patch);
            setTextSeeds((ss) => ss.map((x, j) => (j === editing ? null : x)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
