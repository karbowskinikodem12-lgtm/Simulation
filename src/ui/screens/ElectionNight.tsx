import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../../store/gameStore';
import { STATES, STATE_BY_CODE, EV_TO_WIN } from '../../data/states';
import { USMap } from '../map/USMap';
import { EVBar } from '../charts/EVBar';
import { Avatar } from '../components/common';
import { marginFill, mix, NEUTRAL } from '../colors';
import { createRng } from '../../engine/rng';
import { fmtVotes } from '../../engine/util';

const START = 18.5; // 6:30pm ET
const END = 27.5; // 3:30am ET

function clockLabel(t: number) {
  const h = Math.floor(t) % 24;
  const m = Math.floor((t % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
  const [t, setT] = useState(START);
  const [rate, setRate] = useState(1);
  const last = useRef<number | null>(null);

  // Deterministic per-state counting skew (early vs. late counted ballots).
  const skew = useMemo(() => {
    const rng = createRng(game.settings.seed ^ 0xabcdef);
    const out: Record<string, Record<string, number>> = {};
    for (const s of STATES) out[s.code] = Object.fromEntries(game.candidates.map((c) => [c.id, rng.normal(0, 0.025)]));
    return out;
  }, [game]);

  useEffect(() => {
    let raf = 0;
    const step = (now: number) => {
      if (last.current !== null) {
        const dt = (now - last.current) / 1000;
        setT((v) => Math.min(END, v + dt * rate * (10 / 60))); // 10 game-minutes per second at 1x
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

  return (
    <div className="night-screen">
      <header className="night-header">
        <div className="brand display">
          <span className="brand-mark">★</span> Wieczór wyborczy
        </div>
        <div className="night-clock display">
          {clockLabel(t)} <span className="tiny muted">ET</span>
        </div>
        <div className="row">
          {[1, 3, 8].map((r) => (
            <button key={r} className={`btn sm${rate === r ? ' active' : ''}`} onClick={() => setRate(r)}>
              {r}×
            </button>
          ))}
          <button className="btn sm" onClick={() => setT(END)}>
            Pomiń ⏭
          </button>
          <button className={`btn ${finished ? 'primary' : ''}`} onClick={() => setScreen('results')}>
            Podsumowanie wyborów →
          </button>
        </div>
      </header>

      <div className="panel night-ev">
        <EVBar candidates={game.candidates} ev={calledEv} height={22} />
      </div>

      <div className="night-body">
        <div className="panel night-map">
          {projected && (
            <div className="winner-banner" style={{ borderColor: projected.color }}>
              <Avatar name={projected.name} color={projected.color} size={46} />
              <div>
                <div className="tiny display" style={{ letterSpacing: '0.2em', color: 'var(--accent)' }}>
                  PROJEKCJA
                </div>
                <div className="display" style={{ fontSize: 26, fontWeight: 800 }}>
                  {projected.name} wygrywa wybory
                </div>
              </div>
            </div>
          )}
          {finished && !projected && result.contingent && (
            <div className="winner-banner" style={{ borderColor: winner.color }}>
              <div>
                <div className="tiny display" style={{ letterSpacing: '0.2em', color: 'var(--accent)' }}>
                  BRAK 270 GŁOSÓW
                </div>
                <div className="display" style={{ fontSize: 22, fontWeight: 800 }}>
                  Izba Reprezentantów wybiera: {winner.name}
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
                <span className="mono">{fmtVotes(popular[c.id])}</span>
                <span className="muted mono">({counted > 0 ? ((popular[c.id] / counted) * 100).toFixed(1) : '0.0'}%)</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="night-side">
          <div className="panel section col" style={{ gap: 6 }}>
            <div className="panel-title">Kluczowe stany</div>
            {keyRaces.map(({ s }) => {
              const n = night[s.code];
              const sorted = game.candidates.map((c) => ({ c, v: n.shares[c.id] })).sort((a, b) => b.v - a.v);
              return (
                <div key={s.code} className="race-row">
                  <div className="spread small">
                    <b>
                      {s.name} <span className="muted tiny">{s.ev} EV</span>
                    </b>
                    {n.called ? (
                      <span className="chip" style={{ color: game.candidates.find((c) => c.id === n.called)!.color }}>
                        ✓ {game.candidates.find((c) => c.id === n.called)!.name.split(' ').slice(-1)[0]}
                      </span>
                    ) : n.reported > 0 ? (
                      <span className="tiny muted">{Math.round(n.reported * 100)}% policzonych</span>
                    ) : (
                      <span className="tiny muted">lokale do {clockLabel(s.pollClose)}</span>
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
            <div className="panel-title">Projekcje</div>
            {calls.length === 0 && <div className="tiny muted">Pierwsze lokale zamykamy o 19:00 ET…</div>}
            {calls.map(({ s, at }) => {
              const w = game.candidates.find((c) => c.id === night[s.code].called)!;
              return (
                <div key={s.code} className="call-item" style={{ borderLeftColor: w.color }}>
                  <span className="tiny muted mono">{clockLabel(Math.max(s.pollClose, at))}</span>
                  <span className="small">
                    <b>{STATE_BY_CODE[s.code].name}</b> dla {w.name}
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
  return (
    <div className="col" style={{ gap: 4 }}>
      <div className="spread">
        <b>{s.name}</b>
        <span className="chip">{s.ev} EV</span>
      </div>
      {n.reported === 0 ? (
        <div className="tiny muted">Lokale otwarte do {clockLabel(s.pollClose)} ET</div>
      ) : (
        <>
          {game.candidates.map((c) => (
            <div key={c.id} className="spread small">
              <span style={{ color: c.color }}>{c.name}</span>
              <span className="mono">{(n.shares[c.id] * 100).toFixed(1)}%</span>
            </div>
          ))}
          <div className="tiny muted">
            Policzono {Math.round(n.reported * 100)}% głosów{n.called ? ' · projekcja ogłoszona' : ''}
          </div>
        </>
      )}
    </div>
  );
}
