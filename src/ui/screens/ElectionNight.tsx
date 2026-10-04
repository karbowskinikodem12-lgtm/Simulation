import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../../store/gameStore';
import { STATES, STATE_BY_CODE, EV_TO_WIN, stateName } from '../../data/states';
import { USMap } from '../map/USMap';
import { EVBar } from '../charts/EVBar';
import { Avatar } from '../components/common';
import { marginFill, mix, NEUTRAL } from '../colors';
import { createRng } from '../../engine/rng';
import { fmtVotes } from '../../engine/util';
import { LangSwitch } from '../components/LangSwitch';
import { getLang, type Lang } from '../../i18n';
import { useT } from '../../i18n/useT';

const START = 18.5; // 6:30pm ET
const END = 27.5; // 3:30am ET

function clockLabel(t: number, lang: Lang = getLang()) {
  const h = Math.floor(t) % 24;
  const m = String(Math.floor((t % 1) * 60)).padStart(2, '0');
  if (lang === 'en') return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
  return `${String(h).padStart(2, '0')}:${m}`;
}

interface StateNight {
  code: string;
  reported: number;
  shares: Record<string, number>;
  called: string | null;
  calledAt: number | null;
}

export function ElectionNight() {
  const game = useGame((s) => s.game)!;
  const setScreen = useGame((s) => s.setScreen);
  const result = game.result!;
  const { t: tr, loc, lang } = useT();
  const [t, setT] = useState(START);
  const [rate, setRate] = useState(1);
  const [queue, setQueue] = useState<string[]>([]);
  const [victory, setVictory] = useState<'no' | 'show' | 'dismissed'>('no');
  const seen = useRef(new Set<string>());
  const last = useRef<number | null>(null);
  const paused = victory === 'show';

  // Deterministic per-state counting skew (early vs. late counted ballots).
  const skew = useMemo(() => {
    const rng = createRng(game.settings.seed ^ 0xabcdef);
    const out: Record<string, Record<string, number>> = {};
    for (const s of STATES) out[s.code] = Object.fromEntries(game.candidates.map((c) => [c.id, rng.normal(0, 0.025)]));
    return out;
  }, [game]);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  useEffect(() => {
    let raf = 0;
    const step = (now: number) => {
      if (last.current !== null) {
        const dt = (now - last.current) / 1000;
        if (!pausedRef.current) setT((v) => Math.min(END, v + dt * rate * (10 / 60))); // 10 game-minutes per second at 1x
      }
      last.current = now;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      last.current = null;
    };
  }, [rate]);

  const night = useMemo(() => {
    const out: Record<string, StateNight> = {};
    for (const s of STATES) {
      const r = result.states[s.code];
      const finalShares = r.shares;
      const sorted = Object.entries(finalShares).sort((a, b) => b[1] - a[1]);
      const margin = sorted[0][1] - sorted[1][1];
      const since = t - s.pollClose;
      let reported = since <= 0 ? 0 : 1 - Math.exp(-since * s.countSpeed * 1.25);
      if (reported > 0.985) reported = 1;
      const shares: Record<string, number> = {};
      let tot = 0;
      for (const c of game.candidates) {
        shares[c.id] = Math.max(0.001, finalShares[c.id] + skew[s.code][c.id] * (1 - reported));
        tot += shares[c.id];
      }
      for (const id of Object.keys(shares)) shares[id] /= tot;
      const needed = margin > 0.15 ? 0 : Math.max(0.25, 1 - margin * 8);
      const isCalled = since > 0 && reported >= needed;
      const calledAt = isCalled ? s.pollClose + (needed <= 0 ? 0 : -Math.log(1 - Math.min(0.985, needed)) / (s.countSpeed * 1.25)) : null;
      out[s.code] = { code: s.code, reported, shares, called: isCalled ? r.winner : null, calledAt };
    }
    return out;
  }, [t, result, game, skew]);

  const calledEv: Record<string, number> = {};
  for (const c of game.candidates) calledEv[c.id] = 0;
  for (const s of STATES) {
    const n = night[s.code];
    if (n.called) for (const [id, ev] of Object.entries(result.states[s.code].ev)) calledEv[id] += ev;
  }
  const projected = game.candidates.find((c) => calledEv[c.id] >= EV_TO_WIN);
  const allCalled = STATES.every((s) => night[s.code].called);
  const finished = allCalled || t >= END;

  const fills: Record<string, string> = {};
  for (const s of STATES) {
    const n = night[s.code];
    const color = game.candidates.find((c) => c.id === result.states[s.code].winner)!.color;
    if (n.called) {
      const sh = Object.values(result.states[s.code].shares).sort((a, b) => b - a);
      fills[s.code] = marginFill(color, sh[0] - sh[1]);
    } else if (n.reported > 0) {
      const lead = Object.entries(n.shares).sort((a, b) => b[1] - a[1])[0][0];
      fills[s.code] = mix(NEUTRAL, game.candidates.find((c) => c.id === lead)!.color, 0.18);
    } else fills[s.code] = '#1a2236';
  }

  const calls = STATES.filter((s) => night[s.code].called)
    .map((s) => ({ s, at: night[s.code].calledAt ?? 0 }))
    .sort((a, b) => b.at - a.at);

  const popular: Record<string, number> = {};
  let counted = 0;
  for (const c of game.candidates) popular[c.id] = 0;
  for (const s of STATES) {
    const n = night[s.code];
    const votes = result.states[s.code].totalVotes * n.reported;
    counted += votes;
    for (const c of game.candidates) popular[c.id] += votes * n.shares[c.id];
  }

  const keyRaces = STATES.map((s) => {
    const sh = Object.values(result.states[s.code].shares).sort((a, b) => b - a);
    return { s, m: sh[0] - sh[1] };
  })
    .sort((a, b) => a.m - b.m)
    .slice(0, 8);

  const winner = game.candidates.find((c) => c.id === result.winner)!;

  // Queue newly called states for the big "CALLED" banner.
  const callKey = calls.map((c) => c.s.code).join(',');
  useEffect(() => {
    const fresh = calls.filter((c) => !seen.current.has(c.s.code)).sort((a, b) => a.at - b.at);
    if (!fresh.length) return;
    fresh.forEach((c) => seen.current.add(c.s.code));
    // When skipping ahead, only announce the biggest prizes.
    const toShow = fresh.length > 8 ? [...fresh].sort((a, b) => b.s.ev - a.s.ev).slice(0, 4) : fresh;
    setQueue((q) => [...q, ...toShow.map((c) => c.s.code)].slice(-12));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callKey]);
  useEffect(() => {
    if (!queue.length) return;
    const ev = STATE_BY_CODE[queue[0]].ev;
    const ms = ((ev >= 10 ? 2300 : 1200) / Math.sqrt(rate)) * (queue.length > 4 ? 0.5 : 1);
    const id = setTimeout(() => setQueue((q) => q.slice(1)), ms);
    return () => clearTimeout(id);
  }, [queue, rate]);
  useEffect(() => {
    if (projected && victory === 'no') setVictory('show');
  }, [projected, victory]);
  const banner = queue[0];
  const bannerWinner = banner ? game.candidates.find((c) => c.id === night[banner]?.called) : undefined;

  return (
    <div className="night-screen">
      <header className="night-header">
        <div className="brand display">
          <span className="brand-mark">★</span> {tr('Wieczór wyborczy', 'Election Night')}
        </div>
        <div className="night-clock display">
          {clockLabel(t, lang)} <span className="tiny muted">ET</span>
        </div>
        <div className="row">
          <LangSwitch compact />
          {[1, 3, 8].map((r) => (
            <button key={r} className={`btn sm${rate === r ? ' active' : ''}`} onClick={() => setRate(r)}>
              {r}×
            </button>
          ))}
          <button className="btn sm" onClick={() => setT(END)}>
            {tr('Pomiń', 'Skip')} ⏭
          </button>
          <button className={`btn ${finished ? 'primary' : ''}`} onClick={() => setScreen('results')}>
            {tr('Podsumowanie wyborów →', 'Election summary →')}
          </button>
        </div>
      </header>

      <div className="panel night-ev">
        <EVBar candidates={game.candidates} ev={calledEv} height={26} />
      </div>

      {banner && bannerWinner && (
        <div className="call-banner" key={banner} style={{ ['--cc' as string]: bannerWinner.color }}>
          <div className="call-state display">{loc(stateName(banner)).toUpperCase()}</div>
          <div className="call-text">
            <span className="tiny display" style={{ letterSpacing: '0.18em' }}>
              {tr('PROJEKCJA DLA', 'PROJECTED FOR')}
            </span>
            <b className="display">{bannerWinner.name.toUpperCase()}</b>
          </div>
          <div className="call-ev display">+{result.states[banner].ev[bannerWinner.id] ?? STATE_BY_CODE[banner].ev}</div>
          <div className="tiny display call-ev-label">{tr('GŁOSÓW ELEKTORSKICH', 'ELECTORAL VOTES')}</div>
        </div>
      )}

      {victory === 'show' && projected && (
        <div className="victory-overlay">
          <div className="confetti">
            {Array.from({ length: 60 }, (_, i) => (
              <span
                key={i}
                style={{
                  left: `${(i * 37) % 100}%`,
                  background: i % 3 === 0 ? '#f0b84a' : i % 3 === 1 ? projected.color : '#ffffff',
                  animationDelay: `${(i % 12) * 0.18}s`,
                  animationDuration: `${2.6 + (i % 5) * 0.4}s`,
                }}
              />
            ))}
          </div>
          <div className="victory-card" style={{ borderColor: projected.color, boxShadow: `0 0 120px ${projected.color}66` }}>
            <div className="tiny display" style={{ letterSpacing: '0.3em', color: 'var(--accent)' }}>
              {tr('PROJEKCJA · WYBORY PREZYDENCKIE 2028', 'PROJECTION · 2028 PRESIDENTIAL ELECTION')}
            </div>
            <Avatar name={projected.name} color={projected.color} size={120} />
            <h1 className="display victory-name">{projected.name}</h1>
            <div className="display victory-sub">{tr('ZWYCIĘŻA W WYBORACH PREZYDENCKICH', 'WINS THE PRESIDENCY')}</div>
            <div className="victory-ev display" style={{ color: projected.color }}>
              {calledEv[projected.id]}{' '}
              <span>{tr(`głosów elektorskich · ${EV_TO_WIN} do zwycięstwa`, `electoral votes · ${EV_TO_WIN} to win`)}</span>
            </div>
            {game.playerId && <div className="small text-2">{projected.isPlayer ? tr('Twoja kampania zwyciężyła!', 'Your campaign won!') : tr('Twoja kampania przegrała.', 'Your campaign lost.')}</div>}
            <div className="row" style={{ gap: 10 }}>
              <button className="btn lg" onClick={() => setVictory('dismissed')}>
                {tr('Oglądaj dalej', 'Keep watching')}
              </button>
              <button className="btn primary lg" onClick={() => setScreen('results')}>
                {tr('Podsumowanie wyborów →', 'Election summary →')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="night-body">
        <div className="panel night-map">
          {projected && victory === 'dismissed' && (
            <div className="winner-banner" style={{ borderColor: projected.color }}>
              <Avatar name={projected.name} color={projected.color} size={46} />
              <div>
                <div className="tiny display" style={{ letterSpacing: '0.2em', color: 'var(--accent)' }}>
                  {tr('PROJEKCJA', 'PROJECTION')}
                </div>
                <div className="display" style={{ fontSize: 26, fontWeight: 800 }}>
                  {tr(`${projected.name} wygrywa wybory`, `${projected.name} wins the election`)}
                </div>
              </div>
            </div>
          )}
          {finished && !projected && result.contingent && (
            <div className="winner-banner" style={{ borderColor: winner.color }}>
              <div>
                <div className="tiny display" style={{ letterSpacing: '0.2em', color: 'var(--accent)' }}>
                  {tr(`NIKT NIE MA ${EV_TO_WIN} GŁOSÓW`, `NO ONE REACHED ${EV_TO_WIN}`)}
                </div>
                <div className="display" style={{ fontSize: 22, fontWeight: 800 }}>
                  {tr('Izba Reprezentantów wybiera', 'The House of Representatives elects')}: {winner.name}
                </div>
              </div>
            </div>
          )}
          <USMap fills={fills} badges={Object.fromEntries(STATES.filter((s) => night[s.code].called).map((s) => [s.code, '✓']))} tooltip={(code) => <NightTooltip code={code} n={night[code]} />} />
          <div className="spread small" style={{ padding: '0 16px 12px' }}>
            {game.candidates.map((c) => (
              <div key={c.id} className="row">
                <span className="legend-sw" style={{ background: c.color }} />
                <b>{c.name}</b>
                <span className="mono">{fmtVotes(popular[c.id], lang)}</span>
                <span className="muted mono">({counted > 0 ? ((popular[c.id] / counted) * 100).toFixed(1) : '0.0'}%)</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="night-side">
          <div className="panel section col" style={{ gap: 6 }}>
            <div className="panel-title">{tr('Kluczowe stany', 'Key states')}</div>
            {keyRaces.map(({ s }) => {
              const n = night[s.code];
              const sorted = game.candidates.map((c) => ({ c, v: n.shares[c.id] })).sort((a, b) => b.v - a.v);
              return (
                <div key={s.code} className="race-row">
                  <div className="spread small">
                    <b>
                      {loc(stateName(s.code))}{' '}
                      <span className="muted tiny">
                        {s.ev} {tr('gł. el.', 'EV')}
                      </span>
                    </b>
                    {n.called ? (
                      <span className="chip" style={{ color: game.candidates.find((c) => c.id === n.called)!.color }}>
                        ✓ {game.candidates.find((c) => c.id === n.called)!.name.split(' ').slice(-1)[0]}
                      </span>
                    ) : n.reported > 0 ? (
                      <span className="tiny muted">
                        {Math.round(n.reported * 100)}% {tr('policzonych', 'counted')}
                      </span>
                    ) : (
                      <span className="tiny muted">
                        {tr('lokale do', 'polls close')} {clockLabel(s.pollClose, lang)}
                      </span>
                    )}
                  </div>
                  {n.reported > 0 && (
                    <div className="row tiny">
                      {sorted.map(({ c, v }) => (
                        <span key={c.id} style={{ color: c.color }} className="mono">
                          {(v * 100).toFixed(1)}%
                        </span>
                      ))}
                      <div className="bar grow">
                        <div style={{ width: `${n.reported * 100}%`, background: 'var(--accent-2)' }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="panel section col" style={{ gap: 4, flex: 1, minHeight: 0, overflow: 'auto' }}>
            <div className="panel-title">{tr('Projekcje', 'Projections')}</div>
            {calls.length === 0 && <div className="tiny muted">{tr('Pierwsze lokale zamykamy o 19:00 ET…', 'First polls close at 7:00 PM ET…')}</div>}
            {calls.map(({ s, at }) => {
              const w = game.candidates.find((c) => c.id === night[s.code].called)!;
              return (
                <div key={s.code} className="call-item" style={{ borderLeftColor: w.color }}>
                  <span className="tiny muted mono">{clockLabel(Math.max(s.pollClose, at), lang)}</span>
                  <span className="small">
                    <b>{loc(stateName(s.code))}</b> {tr('dla', 'for')} {w.name}
                  </span>
                  <span className="tiny muted">{STATE_BY_CODE[s.code].ev}</span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

function NightTooltip({ code, n }: { code: string; n: StateNight }) {
  const game = useGame((s) => s.game)!;
  const s = STATE_BY_CODE[code];
  const { t, loc, lang } = useT();
  return (
    <div className="col" style={{ gap: 4 }}>
      <div className="spread">
        <b>{loc(stateName(code))}</b>
        <span className="chip">
          {s.ev} {t('gł. el.', 'EV')}
        </span>
      </div>
      {n.reported === 0 ? (
        <div className="tiny muted">
          {t('Lokale otwarte do', 'Polls open until')} {clockLabel(s.pollClose, lang)} ET
        </div>
      ) : (
        <>
          {game.candidates.map((c) => (
            <div key={c.id} className="spread small">
              <span style={{ color: c.color }}>{c.name}</span>
              <span className="mono">{(n.shares[c.id] * 100).toFixed(1)}%</span>
            </div>
          ))}
          <div className="tiny muted">
            {t(`Policzono ${Math.round(n.reported * 100)}% głosów`, `${Math.round(n.reported * 100)}% of votes counted`)}
            {n.called ? t(' · projekcja ogłoszona', ' · race called') : ''}
          </div>
        </>
      )}
    </div>
  );
}
