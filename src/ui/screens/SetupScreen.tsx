import { useMemo, useState } from 'react';
import { useGame } from '../../store/gameStore';
import type { CandidateSetup, Difficulty, PartyId, ProfileId } from '../../engine/types';
import { PARTIES, PARTY_LIST } from '../../data/parties';
import { PROFILES, PROFILE_LIST, STAT_LABEL, TRAIT_META, VISIBLE_STATS, deriveTraits } from '../../data/profiles';
import { STATES, STATE_BY_CODE } from '../../data/states';
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

const DEFAULTS: { name: string; party: PartyId; profile: ProfileId; home: string }[] = [
  { name: 'Alexandra Reed', party: 'DEM', profile: 'governor', home: 'MI' },
  { name: 'Thomas Whitfield', party: 'REP', profile: 'senator', home: 'OH' },
  { name: 'Morgan Blake', party: 'IND', profile: 'business', home: 'CO' },
];

function freshCandidate(i: number, style: PlatformStyle = 'mainstream'): CandidateSetup {
  const d = DEFAULTS[i];
  const p = generatePlatform(d.party, d.profile, style, randomSeed());
  return { name: d.name, party: d.party, profile: d.profile, homeState: d.home, ...p, stats: rollStats(d.profile, randomSeed()) };
}

const LENGTHS = [
  { days: 45, label: 'Krótka', desc: '45 dni' },
  { days: 60, label: 'Standard', desc: '60 dni' },
  { days: 90, label: 'Długa', desc: '90 dni' },
];

const DIFFS: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Łatwy' },
  { id: 'normal', label: 'Normalny' },
  { id: 'hard', label: 'Trudny' },
];

export function SetupScreen() {
  const { setScreen, newGame } = useGame();
  const [count, setCount] = useState<2 | 3>(2);
  const [cands, setCands] = useState<CandidateSetup[]>(() => [0, 1, 2].map((i) => freshCandidate(i)));
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
    const p = generatePlatform(party, profile, style, randomSeed());
    update(i, { party, profile, ...p });
  };

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
          ← Menu
        </button>
        <div className="display" style={{ fontSize: 26, fontWeight: 800 }}>
          Nowe wybory
        </div>
        <div className="grow" />
        <button className="btn primary lg" onClick={start}>
          Rozpocznij kampanię →
        </button>
      </header>

      <div className="setup-body">
        <aside className="panel setup-settings">
          <div className="section col">
            <div className="panel-title">Liczba kandydatów</div>
            <div className="segmented">
              {[2, 3].map((n) => (
                <button key={n} className={count === n ? 'on' : ''} onClick={() => setCount(n as 2 | 3)}>
                  {n} kandydatów
                </button>
              ))}
            </div>
          </div>
          <div className="section col">
            <div className="panel-title">Tryb gry</div>
            <select className="select" value={playerIndex === null ? 'spect' : String(playerIndex)} onChange={(e) => setPlayerIndex(e.target.value === 'spect' ? null : Number(e.target.value))}>
              {active.map((c, i) => (
                <option key={i} value={i}>
                  Gram jako: {c.name || `Kandydat ${i + 1}`}
                </option>
              ))}
              <option value="spect">Obserwator (symulacja AI vs AI)</option>
            </select>
          </div>
          <div className="section col">
            <div className="panel-title">Długość kampanii</div>
            <div className="segmented">
              {LENGTHS.map((l) => (
                <button key={l.days} className={days === l.days ? 'on' : ''} onClick={() => setDays(l.days)} title={l.desc}>
                  {l.label} · {l.desc}
                </button>
              ))}
            </div>
          </div>
          <div className="section col">
            <div className="panel-title">Poziom trudności</div>
            <div className="segmented">
              {DIFFS.map((d) => (
                <button key={d.id} className={difficulty === d.id ? 'on' : ''} onClick={() => setDifficulty(d.id)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="section col">
            <div className="panel-title">Partia rządząca</div>
            <select className="select" value={incumbentParty ?? 'none'} onChange={(e) => setIncumbent(e.target.value as PartyId | 'none')}>
              <option value="none">Brak (otwarte wybory)</option>
              {parties.map((p) => (
                <option key={p} value={p}>
                  {PARTIES[p].name}
                </option>
              ))}
            </select>
            <div className="tiny muted">Kandydat partii rządzącej jest nagradzany lub karany za stan gospodarki.</div>
          </div>
          <div className="section col">
            <div className="panel-title">Prognoza startowa</div>
            <div className="setup-minimap">
              <USMap fills={preview.fills} showLabels={false} />
            </div>
            <EVBar candidates={preview.g.candidates} ev={preview.snap.projectedEv} height={14} />
            <div className="col" style={{ gap: 4 }}>
              {preview.g.candidates.map((c) => (
                <div key={c.id} className="spread small">
                  <span style={{ color: c.color }}>{c.name}</span>
                  <span className="mono">
                    {(preview.snap.national[c.id] * 100).toFixed(1)}% · szansa {Math.round((preview.g.forecast?.winProb[c.id] ?? 0) * 100)}%
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
                    <input className="input cand-name" value={c.name} placeholder="Imię i nazwisko" maxLength={32} onChange={(e) => update(i, { name: e.target.value })} />
                    <div className="row tiny">
                      {playerIndex === i ? <span className="chip" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>★ TWÓJ KANDYDAT</span> : <span className="chip">AI</span>}
                      <span className="muted ellipsis">„{c.slogan}”</span>
                    </div>
                  </div>
                </div>
                <div className="section col">
                  <div className="panel-title">Partia</div>
                  <div className="party-grid">
                    {PARTY_LIST.map((p) => (
                      <button key={p.id} className={`party-btn${c.party === p.id ? ' on' : ''}`} style={{ ['--pc' as string]: p.color }} onClick={() => regenerate(i, styles[i], p.id)} title={p.description}>
                        <span className="dot" />
                        {p.short}
                      </button>
                    ))}
                  </div>
                  <div className="tiny muted">{party.description}</div>
                </div>
                <div className="section">
                  <div className="row" style={{ gap: 10 }}>
                    <label className="field grow">
                      Profil
                      <select className="select" value={c.profile} onChange={(e) => update(i, { profile: e.target.value as ProfileId, stats: rollStats(e.target.value as ProfileId, randomSeed()) })}>
                        {PROFILE_LIST.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field grow">
                      Stan rodzinny
                      <select className="select" value={c.homeState} onChange={(e) => update(i, { homeState: e.target.value })}>
                        {STATES.filter((s) => s.code !== 'DC').map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="tiny muted" style={{ marginTop: 6 }}>
                    {prof.description}
                  </div>
                  <div className="stat-grid">
                    {VISIBLE_STATS.map((k) => (
                      <StatBar key={k} label={STAT_LABEL[k]} value={(c.stats ?? prof.stats)[k]} color={color} />
                    ))}
                    <div className="col" style={{ gap: 3 }}>
                      <div className="spread tiny">
                        <span className="muted">Skandale</span>
                        <span className="mono">?</span>
                      </div>
                      <div className="tiny muted">ukryte</div>
                    </div>
                  </div>
                  <div className="row wrap" style={{ gap: 4, marginTop: 8 }}>
                    {deriveTraits(c.stats ?? prof.stats).map((t) => (
                      <span key={t} className={`chip trait ${TRAIT_META[t].good ? 'good' : 'bad'}`} title={TRAIT_META[t].desc}>
                        {TRAIT_META[t].icon} {TRAIT_META[t].label}
                      </span>
                    ))}
                    <button className="btn sm ghost" style={{ marginLeft: 'auto' }} onClick={() => update(i, { stats: rollStats(c.profile, randomSeed()) })} title="Każdy kandydat ma indywidualne statystyki wokół profilu">
                      🎲 Losuj cechy
                    </button>
                  </div>
                </div>
                <div className="section col grow">
                  <div className="panel-title">
                    Program
                    <button className="btn sm" onClick={() => setEditing(i)}>
                      ✎ Edytuj / wpisz własny
                    </button>
                  </div>
                  <div className="col" style={{ gap: 6 }}>
                    {signature.map((iss) => {
                      const v = c.positions[iss.id];
                      return (
                        <div key={iss.id} className="stance-row">
                          <span className="small">
                            {iss.icon} {iss.label}
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
                          {STYLE_LABEL[s]}
                        </button>
                      ))}
                    </div>
                    <button className="btn sm grow" onClick={() => regenerate(i)}>
                      🤖 Generuj program AI
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
          title={`${cands[editing].name} — ${STATE_BY_CODE[cands[editing].homeState].name}`}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            update(editing, patch);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
