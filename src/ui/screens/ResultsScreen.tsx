import { useMemo, useState } from 'react';
import { useGame } from '../../store/gameStore';
import { STATES, STATE_BY_CODE } from '../../data/states';
import { PARTIES } from '../../data/parties';
import { USMap } from '../map/USMap';
import { EVBar } from '../charts/EVBar';
import { LineChart } from '../charts/LineChart';
import { Avatar } from '../components/common';
import { marginFill } from '../colors';
import { dayLabel } from '../selectors';
import { fmtMoney, fmtVotes } from '../../engine/util';

type Tab = 'summary' | 'states' | 'campaign';
type SortKey = 'name' | 'ev' | 'margin' | 'turnout';

export function ResultsScreen() {
  const game = useGame((s) => s.game)!;
  const { setScreen } = useGame();
  const [tab, setTab] = useState<Tab>('summary');
  const result = game.result;
  if (!result) {
    return (
      <div className="results-screen center" style={{ paddingTop: 80 }}>
        Brak wyników. <button className="btn" onClick={() => setScreen('menu')}>Menu</button>
      </div>
    );
  }
  const winner = game.candidates.find((c) => c.id === result.winner)!;
  const fills: Record<string, string> = {};
  for (const s of STATES) {
    const r = result.states[s.code];
    const sh = Object.values(r.shares).sort((a, b) => b - a);
    fills[s.code] = marginFill(game.candidates.find((c) => c.id === r.winner)!.color, sh[0] - sh[1]);
  }
  const player = game.candidates.find((c) => c.id === game.playerId);

  return (
    <div className="results-screen">
      <header className="results-header">
        <div className="brand display">
          <span className="brand-mark">★</span> Wyniki wyborów 2028
        </div>
        <div className="segmented">
          {(
            [
              ['summary', 'Podsumowanie'],
              ['states', 'Wyniki w stanach'],
              ['campaign', 'Przebieg kampanii'],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="row">
          <button className="btn" onClick={() => setScreen('election')}>
            ↺ Powtórka wieczoru
          </button>
          <button className="btn primary" onClick={() => setScreen('setup')}>
            Nowe wybory
          </button>
          <button className="btn ghost" onClick={() => setScreen('menu')}>
            Menu
          </button>
        </div>
      </header>

      <div className="results-body">
        {tab === 'summary' && (
          <div className="results-summary">
            <div className="panel hero" style={{ background: `linear-gradient(120deg, ${winner.color}44, rgba(14,23,42,0.9) 55%)` }}>
              <Avatar name={winner.name} color={winner.color} size={96} />
              <div className="grow">
                <div className="tiny display" style={{ letterSpacing: '0.2em', color: 'var(--accent)' }}>
                  {player ? (player.id === winner.id ? 'ZWYCIĘSTWO!' : 'PORAŻKA') : 'PREZYDENT ELEKT'}
                </div>
                <h1 className="display" style={{ fontSize: 40, lineHeight: 1.05 }}>
                  {result.analysis.headline}
                </h1>
                <div className="text-2" style={{ marginTop: 4 }}>
                  {winner.name} ({PARTIES[winner.party].name}) — „{winner.slogan}”
                </div>
              </div>
              <div className="hero-stats">
                <div>
                  <div className="tiny muted">Frekwencja</div>
                  <div className="display stat-big">{(result.turnout * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="tiny muted">Oddane głosy</div>
                  <div className="display stat-big">{fmtVotes(result.totalVotes)}</div>
                </div>
              </div>
            </div>

            <div className="panel section">
              <EVBar candidates={game.candidates} ev={result.ev} height={28} />
            </div>

            <div className="results-grid">
              <div className="panel section col">
                <div className="panel-title">Głosowanie powszechne</div>
                {[...game.candidates]
                  .sort((a, b) => result.popular[b.id] - result.popular[a.id])
                  .map((c) => (
                    <div key={c.id} className="col" style={{ gap: 4 }}>
                      <div className="spread">
                        <span className="row">
                          <Avatar name={c.name} color={c.color} size={28} />
                          <b>{c.name}</b>
                          <span className="tiny muted">{PARTIES[c.party].short}</span>
                        </span>
                        <span className="mono">
                          <b style={{ fontSize: 18 }}>{(result.popularShare[c.id] * 100).toFixed(1)}%</b>{' '}
                          <span className="muted small">{fmtVotes(result.popular[c.id])}</span>
                        </span>
                      </div>
                      <div className="bar" style={{ height: 10 }}>
                        <div style={{ width: `${result.popularShare[c.id] * 100}%`, background: c.color }} />
                      </div>
                      <div className="tiny muted">
                        {result.ev[c.id]} EV · wygrane stany: {STATES.filter((s) => result.states[s.code].winner === c.id).length} · wydane {fmtMoney(c.totals.spent)} · wiece {c.totals.rallies} · debaty {c.totals.debatesWon}
                      </div>
                    </div>
                  ))}
                <div className="results-minimap">
                  <USMap fills={fills} showLabels={false} />
                </div>
              </div>

              <div className="panel section col">
                <div className="panel-title">Dlaczego wygrywa {winner.name}?</div>
                <ul className="reason-list">
                  {result.analysis.reasons.map((r, i) => (
                    <li key={i} className="good-li">
                      {r}
                    </li>
                  ))}
                </ul>
                {result.analysis.caveats.length > 0 && (
                  <>
                    <div className="panel-title" style={{ marginTop: 6 }}>
                      Co działało na korzyść rywali
                    </div>
                    <ul className="reason-list">
                      {result.analysis.caveats.map((r, i) => (
                        <li key={i} className="bad-li">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <div className="panel-title" style={{ marginTop: 6 }}>
                  Czynniki w kluczowych stanach (zwycięzca vs. drugi kandydat)
                </div>
                <FactorChart factors={result.analysis.factors} color={winner.color} />
              </div>

              <div className="panel section col">
                <div className="panel-title">Najważniejsze wydarzenia kampanii</div>
                <KeyEvents />
              </div>
            </div>
          </div>
        )}

        {tab === 'states' && <StatesTab fills={fills} />}
        {tab === 'campaign' && <CampaignTab />}
      </div>
    </div>
  );
}

function FactorChart({ factors, color }: { factors: { label: string; value: number }[]; color: string }) {
  const max = Math.max(0.05, ...factors.map((f) => Math.abs(f.value)));
  return (
    <div className="col" style={{ gap: 5 }}>
      {factors.map((f) => (
        <div key={f.label} className="factor-row">
          <span className="tiny text-2 ellipsis" style={{ width: 170 }}>
            {f.label}
          </span>
          <div className="factor-track">
            <div className="factor-zero" />
            <div
              className="factor-bar"
              style={{
                left: f.value >= 0 ? '50%' : `${50 - (Math.abs(f.value) / max) * 50}%`,
                width: `${(Math.abs(f.value) / max) * 50}%`,
                background: f.value >= 0 ? color : 'var(--bad)',
              }}
            />
          </div>
          <span className="tiny mono" style={{ width: 40, textAlign: 'right' }}>
            {f.value > 0 ? '+' : ''}
            {(f.value * 100).toFixed(0)}
          </span>
        </div>
      ))}
    </div>
  );
}

function KeyEvents() {
  const game = useGame((s) => s.game)!;
  const events = [...game.keyEvents]
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact) || a.day - b.day)
    .slice(0, 10)
    .sort((a, b) => a.day - b.day);
  return (
    <div className="timeline-list">
      {events.length === 0 && <div className="tiny muted">Spokojna kampania bez większych wstrząsów.</div>}
      {events.map((e, i) => {
        const c = game.candidates.find((x) => x.id === e.candId);
        return (
          <div key={i} className="tl-item" style={{ borderLeftColor: c?.color ?? 'var(--accent)' }}>
            <div className="tiny muted">{dayLabel(game, e.day)}</div>
            <div className="small">{e.text}</div>
          </div>
        );
      })}
    </div>
  );
}

function StatesTab({ fills }: { fills: Record<string, string> }) {
  const game = useGame((s) => s.game)!;
  const result = game.result!;
  const [sort, setSort] = useState<SortKey>('ev');
  const [selected, setSelected] = useState<string | null>(null);
  const [a, b] = [...game.candidates].sort((x, y) => result.ev[y.id] - result.ev[x.id]);
  const rows = useMemo(() => {
    const r = STATES.map((s) => {
      const res = result.states[s.code];
      const sh = Object.values(res.shares).sort((x, y) => y - x);
      return { s, res, margin: sh[0] - sh[1] };
    });
    const cmp: Record<SortKey, (x: (typeof r)[0], y: (typeof r)[0]) => number> = {
      name: (x, y) => x.s.name.localeCompare(y.s.name),
      ev: (x, y) => y.s.ev - x.s.ev,
      margin: (x, y) => x.margin - y.margin,
      turnout: (x, y) => y.res.turnout - x.res.turnout,
    };
    return r.sort(cmp[sort]);
  }, [result, sort]);

  return (
    <div className="states-tab">
      <div className="panel" style={{ padding: 12 }}>
        <USMap fills={fills} selected={selected} onSelect={(c) => setSelected(c === selected ? null : c)} tooltip={(code) => <ResultTooltip code={code} />} />
        <div className="tiny muted center">Mapa ostatecznych wyników · intensywność koloru = przewaga</div>
      </div>
      <div className="panel table-wrap">
        <table className="results-table">
          <thead>
            <tr>
              <th onClick={() => setSort('name')}>Stan {sort === 'name' && '▾'}</th>
              <th onClick={() => setSort('ev')}>EV {sort === 'ev' && '▾'}</th>
              {game.candidates.map((c) => (
                <th key={c.id} style={{ color: c.color }}>
                  {c.name.split(' ').slice(-1)[0]}
                </th>
              ))}
              <th onClick={() => setSort('margin')}>Przewaga {sort === 'margin' && '▾'}</th>
              <th onClick={() => setSort('turnout')}>Frekw. {sort === 'turnout' && '▾'}</th>
              <th>Wcześniej</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, res, margin }) => {
              const w = game.candidates.find((c) => c.id === res.winner)!;
              const split = Object.values(res.ev).filter((v) => v > 0).length > 1;
              return (
                <tr key={s.code} className={selected === s.code ? 'sel' : ''} onClick={() => setSelected(s.code)}>
                  <td>
                    <span className="win-dot" style={{ background: w.color }} />
                    {s.name}
                    {margin < 0.03 && <span className="chip swing" style={{ marginLeft: 6 }}>o włos</span>}
                  </td>
                  <td className="mono">{split ? game.candidates.map((c) => res.ev[c.id]).filter(Boolean).join('/') : s.ev}</td>
                  {game.candidates.map((c) => (
                    <td key={c.id} className="mono" style={{ fontWeight: c.id === res.winner ? 800 : 400 }}>
                      {(res.shares[c.id] * 100).toFixed(1)}%
                    </td>
                  ))}
                  <td className="mono" style={{ color: w.color }}>
                    +{(margin * 100).toFixed(1)}
                  </td>
                  <td className="mono">{(res.turnout * 100).toFixed(0)}%</td>
                  <td className="mono muted">{(res.earlyShare * 100).toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="tiny muted" style={{ padding: 8 }}>
          {a.name} vs {b.name}. „Wcześniej” = odsetek głosów oddanych przed dniem wyborów. Maine i Nebraska przyznają część głosów według okręgów.
        </div>
      </div>
    </div>
  );
}

function ResultTooltip({ code }: { code: string }) {
  const game = useGame((s) => s.game)!;
  const r = game.result!.states[code];
  const s = STATE_BY_CODE[code];
  return (
    <div className="col" style={{ gap: 3 }}>
      <div className="spread">
        <b>{s.name}</b>
        <span className="chip">{s.ev} EV</span>
      </div>
      {game.candidates.map((c) => (
        <div key={c.id} className="spread small">
          <span style={{ color: c.color }}>{c.name}</span>
          <span className="mono">
            {(r.shares[c.id] * 100).toFixed(1)}% · {fmtVotes(r.votes[c.id])}
          </span>
        </div>
      ))}
      <div className="tiny muted">Frekwencja {(r.turnout * 100).toFixed(1)}%</div>
    </div>
  );
}

function CampaignTab() {
  const game = useGame((s) => s.game)!;
  const h = game.history;
  const markers = game.debates.filter((d) => d.done).map((d, i) => ({ x: d.day, label: `D${i + 1}` }));
  const lbl = (i: number) => dayLabel(game, h[i]?.day ?? 0);
  const finalShares = game.result!.popularShare;
  return (
    <div className="campaign-tab">
      <div className="panel section col">
        <div className="panel-title">Poparcie w sondażach (średnia krajowa, %)</div>
        <LineChart
          height={240}
          series={game.candidates.map((c) => ({ id: c.id, label: c.name, color: c.color, values: h.map((x) => x.national[c.id] * (1 - x.undecided) * 100) }))}
          xLabels={lbl}
          markers={markers}
          yFormat={(v) => `${v.toFixed(0)}%`}
        />
        <div className="tiny muted">
          Wynik rzeczywisty: {game.candidates.map((c) => `${c.name} ${(finalShares[c.id] * 100).toFixed(1)}%`).join(' · ')} — różnica względem sondaży to błąd pomiaru i niezdecydowani.
        </div>
      </div>
      <div className="results-grid two">
        <div className="panel section col">
          <div className="panel-title">Szanse na zwycięstwo (prognoza, %)</div>
          <LineChart height={200} series={game.candidates.map((c) => ({ id: c.id, label: c.name, color: c.color, values: h.map((x) => x.winProb[c.id] * 100) }))} xLabels={lbl} yMin={0} yMax={100} markers={markers} refLine={50} yFormat={(v) => `${v.toFixed(0)}%`} />
        </div>
        <div className="panel section col">
          <div className="panel-title">Prognozowane głosy elektorskie</div>
          <LineChart height={200} series={game.candidates.map((c) => ({ id: c.id, label: c.name, color: c.color, values: h.map((x) => x.ev[c.id] ?? 0) }))} xLabels={lbl} yMin={0} yMax={538} refLine={270} markers={markers} />
        </div>
      </div>
      <div className="results-grid two">
        <div className="panel section col">
          <div className="panel-title">Debaty</div>
          {game.debates.map((d) => {
            const w = game.candidates.find((c) => c.id === d.winner);
            return (
              <div key={d.id} className="spread small">
                <span>
                  {d.title} · {dayLabel(game, d.day)}
                </span>
                {w ? (
                  <span style={{ color: w.color }}>
                    🏆 {w.name} · {d.participants?.map((id) => `${d.flashPoll?.[id]}%`).join(' / ')}
                  </span>
                ) : (
                  <span className="muted">—</span>
                )}
              </div>
            );
          })}
          <div className="panel-title" style={{ marginTop: 8 }}>
            Finanse kampanii
          </div>
          {game.candidates.map((c) => (
            <div key={c.id} className="spread small">
              <span style={{ color: c.color }}>{c.name}</span>
              <span className="mono">
                zebrane {fmtMoney(c.totals.raised)} · wydane {fmtMoney(c.totals.spent)} · reklamy {c.totals.adsRun}
              </span>
            </div>
          ))}
        </div>
        <div className="panel section col">
          <div className="panel-title">Kronika kampanii</div>
          <div className="timeline-list" style={{ maxHeight: 300, overflow: 'auto' }}>
            {game.news
              .filter((n) => n.tone === 'breaking' || n.category === 'debate')
              .slice(0, 30)
              .map((n) => (
                <div key={n.id} className="tl-item" style={{ borderLeftColor: game.candidates.find((c) => c.id === n.candId)?.color ?? 'var(--accent)' }}>
                  <div className="tiny muted">{dayLabel(game, n.day)}</div>
                  <div className="small">{n.headline}</div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
