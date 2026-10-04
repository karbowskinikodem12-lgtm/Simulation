import { useMemo, useState } from 'react';
import { useGame } from '../../store/gameStore';
import { STATES, STATE_BY_CODE, stateName } from '../../data/states';
import { PARTIES } from '../../data/parties';
import { USMap } from '../map/USMap';
import { EVBar } from '../charts/EVBar';
import { LineChart } from '../charts/LineChart';
import { Avatar } from '../components/common';
import { marginFill } from '../colors';
import { dayLabel } from '../selectors';
import { fmtMoney, fmtVotes } from '../../engine/util';
import { GROUP_LABEL, GROUP_SETS } from '../../engine/groups';
import { LangSwitch } from '../components/LangSwitch';
import type { LStr } from '../../i18n';
import { useT } from '../../i18n/useT';

type Tab = 'summary' | 'states' | 'groups' | 'campaign';
type SortKey = 'name' | 'ev' | 'margin' | 'turnout';

export function ResultsScreen() {
  const game = useGame((s) => s.game)!;
  const { setScreen } = useGame();
  const [tab, setTab] = useState<Tab>('summary');
  const { t, loc, lang, q } = useT();
  const result = game.result;
  if (!result) {
    return (
      <div className="results-screen center" style={{ paddingTop: 80 }}>
        {t('Brak wyników.', 'No results.')}{' '}
        <button className="btn" onClick={() => setScreen('menu')}>
          {t('Menu', 'Menu')}
        </button>
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
          <span className="brand-mark">★</span> {t('Wyniki wyborów 2028', '2028 Election Results')}
        </div>
        <div className="segmented">
          {(
            [
              ['summary', t('Podsumowanie', 'Summary')],
              ['states', t('Wyniki w stanach', 'State results')],
              ['groups', t('Grupy wyborców', 'Voter groups')],
              ['campaign', t('Przebieg kampanii', 'Campaign recap')],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="row">
          <LangSwitch compact />
          <button className="btn" onClick={() => setScreen('election')}>
            ↺ {t('Powtórka wieczoru', 'Replay the night')}
          </button>
          <button className="btn primary" onClick={() => setScreen('setup')}>
            {t('Nowe wybory', 'New election')}
          </button>
          <button className="btn ghost" onClick={() => setScreen('menu')}>
            {t('Menu', 'Menu')}
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
                  {player ? (player.id === winner.id ? t('ZWYCIĘSTWO!', 'VICTORY!') : t('PORAŻKA', 'DEFEAT')) : t('PREZYDENT ELEKT', 'PRESIDENT-ELECT')}
                </div>
                <h1 className="display" style={{ fontSize: 40, lineHeight: 1.05 }}>
                  {loc(result.analysis.headline)}
                </h1>
                <div className="text-2" style={{ marginTop: 4 }}>
                  {winner.name} ({loc(PARTIES[winner.party].name)}) — {q(winner.slogan)}
                </div>
                <div className="summary-line">{loc(result.analysis.summary)}</div>
              </div>
              <div className="hero-stats">
                <div>
                  <div className="tiny muted">{t('Frekwencja', 'Turnout')}</div>
                  <div className="display stat-big">{(result.turnout * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="tiny muted">{t('Oddane głosy', 'Votes cast')}</div>
                  <div className="display stat-big">{fmtVotes(result.totalVotes, lang)}</div>
                </div>
              </div>
            </div>

            <div className="panel section">
              <EVBar candidates={game.candidates} ev={result.ev} height={28} />
            </div>

            <div className="results-grid">
              <div className="panel section col">
                <div className="panel-title">{t('Głosowanie powszechne', 'Popular vote')}</div>
                {[...game.candidates]
                  .sort((a, b) => result.popular[b.id] - result.popular[a.id])
                  .map((c) => (
                    <div key={c.id} className="col" style={{ gap: 4 }}>
                      <div className="spread">
                        <span className="row">
                          <Avatar name={c.name} color={c.color} size={28} />
                          <b>{c.name}</b>
                          <span className="tiny muted">{loc(PARTIES[c.party].short)}</span>
                        </span>
                        <span className="mono">
                          <b style={{ fontSize: 18 }}>{(result.popularShare[c.id] * 100).toFixed(1)}%</b>{' '}
                          <span className="muted small">{fmtVotes(result.popular[c.id], lang)}</span>
                        </span>
                      </div>
                      <div className="bar" style={{ height: 10 }}>
                        <div style={{ width: `${result.popularShare[c.id] * 100}%`, background: c.color }} />
                      </div>
                      <div className="tiny muted">
                        {result.ev[c.id]} {t('gł. el.', 'EV')} · {t('wygrane stany', 'states won')}: {STATES.filter((s) => result.states[s.code].winner === c.id).length} · {t('wydane', 'spent')} {fmtMoney(c.totals.spent, lang)} · {t('wiece', 'rallies')} {c.totals.rallies} · {t('wygrane debaty', 'debates won')} {c.totals.debatesWon}
                      </div>
                    </div>
                  ))}
                <div className="results-minimap">
                  <USMap fills={fills} showLabels={false} />
                </div>
              </div>

              <div className="panel section col">
                <div className="panel-title">{t(`Dlaczego wygrywa ${winner.name}?`, `Why ${winner.name} won`)}</div>
                <ul className="reason-list">
                  {result.analysis.reasons.map((r, i) => (
                    <li key={i} className="good-li">
                      {loc(r)}
                    </li>
                  ))}
                </ul>
                {result.analysis.caveats.length > 0 && (
                  <>
                    <div className="panel-title" style={{ marginTop: 6 }}>
                      {t('Co działało na korzyść rywali', 'What worked for the rivals')}
                    </div>
                    <ul className="reason-list">
                      {result.analysis.caveats.map((r, i) => (
                        <li key={i} className="bad-li">
                          {loc(r)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <div className="panel-title" style={{ marginTop: 6 }}>
                  {t('Czynniki w kluczowych stanach (zwycięzca vs. drugi kandydat)', 'Factors in key states (winner vs. runner-up)')}
                </div>
                <FactorChart factors={result.analysis.factors} color={winner.color} />
              </div>

              <div className="panel section col">
                <div className="panel-title">{t('Najważniejsze wydarzenia kampanii', 'Key campaign events')}</div>
                <KeyEvents />
              </div>
            </div>
            <div className="results-grid two">
              <SwingStates />
              <BigWins />
            </div>
          </div>
        )}

        {tab === 'states' && <StatesTab fills={fills} />}
        {tab === 'groups' && <GroupsTab />}
        {tab === 'campaign' && <CampaignTab />}
      </div>
    </div>
  );
}

function FactorChart({ factors, color }: { factors: { label: LStr; value: number }[]; color: string }) {
  const max = Math.max(0.05, ...factors.map((f) => Math.abs(f.value)));
  const { loc } = useT();
  return (
    <div className="col" style={{ gap: 5 }}>
      {factors.map((f) => (
        <div key={f.label.en} className="factor-row">
          <span className="tiny text-2 ellipsis" style={{ width: 170 }}>
            {loc(f.label)}
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
  const { t, loc, lang } = useT();
  return (
    <div className="timeline-list">
      {events.length === 0 && <div className="tiny muted">{t('Spokojna kampania bez większych wstrząsów.', 'A calm campaign without major shocks.')}</div>}
      {events.map((e, i) => {
        const c = game.candidates.find((x) => x.id === e.candId);
        return (
          <div key={i} className="tl-item" style={{ borderLeftColor: c?.color ?? 'var(--accent)' }}>
            <div className="tiny muted">{dayLabel(game, e.day, false, lang)}</div>
            <div className="small">{loc(e.text)}</div>
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
  const { t, loc, lang } = useT();
  const rows = useMemo(() => {
    const r = STATES.map((s) => {
      const res = result.states[s.code];
      const sh = Object.values(res.shares).sort((x, y) => y - x);
      return { s, res, margin: sh[0] - sh[1] };
    });
    const cmp: Record<SortKey, (x: (typeof r)[0], y: (typeof r)[0]) => number> = {
      name: (x, y) => loc(stateName(x.s.code)).localeCompare(loc(stateName(y.s.code)), lang),
      ev: (x, y) => y.s.ev - x.s.ev,
      margin: (x, y) => x.margin - y.margin,
      turnout: (x, y) => y.res.turnout - x.res.turnout,
    };
    return r.sort(cmp[sort]);
  }, [result, sort, lang]);

  return (
    <div className="states-tab">
      <div className="panel" style={{ padding: 12 }}>
        <USMap fills={fills} selected={selected} onSelect={(c) => setSelected(c === selected ? null : c)} tooltip={(code) => <ResultTooltip code={code} />} />
        <div className="tiny muted center">{t('Mapa ostatecznych wyników · intensywność koloru = przewaga', 'Final results map · color intensity = margin')}</div>
      </div>
      <div className="panel table-wrap">
        <table className="results-table">
          <thead>
            <tr>
              <th onClick={() => setSort('name')}>
                {t('Stan', 'State')} {sort === 'name' && '▾'}
              </th>
              <th onClick={() => setSort('ev')}>
                {t('gł. el.', 'EV')} {sort === 'ev' && '▾'}
              </th>
              {game.candidates.map((c) => (
                <th key={c.id} style={{ color: c.color }}>
                  {c.name.split(' ').slice(-1)[0]}
                </th>
              ))}
              <th onClick={() => setSort('margin')}>
                {t('Przewaga', 'Margin')} {sort === 'margin' && '▾'}
              </th>
              <th onClick={() => setSort('turnout')}>
                {t('Frekw.', 'Turnout')} {sort === 'turnout' && '▾'}
              </th>
              <th>{t('Wcześniej', 'Early')}</th>
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
                    {loc(stateName(s.code))}
                    {margin < 0.03 && (
                      <span className="chip swing" style={{ marginLeft: 6 }}>
                        {t('o włos', 'razor-thin')}
                      </span>
                    )}
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
          {a.name} vs {b.name}.{' '}
          {t('„Wcześniej” = odsetek głosów oddanych przed dniem wyborów. Maine i Nebraska przyznają część głosów według okręgów.', '“Early” = share of votes cast before Election Day. Maine and Nebraska award some electors by district.')}
        </div>
      </div>
    </div>
  );
}

function ResultTooltip({ code }: { code: string }) {
  const game = useGame((s) => s.game)!;
  const r = game.result!.states[code];
  const s = STATE_BY_CODE[code];
  const { t, loc, lang } = useT();
  return (
    <div className="col" style={{ gap: 3 }}>
      <div className="spread">
        <b>{loc(stateName(code))}</b>
        <span className="chip">
          {s.ev} {t('gł. el.', 'EV')}
        </span>
      </div>
      {game.candidates.map((c) => (
        <div key={c.id} className="spread small">
          <span style={{ color: c.color }}>{c.name}</span>
          <span className="mono">
            {(r.shares[c.id] * 100).toFixed(1)}% · {fmtVotes(r.votes[c.id], lang)}
          </span>
        </div>
      ))}
      <div className="tiny muted">
        {t('Frekwencja', 'Turnout')} {(r.turnout * 100).toFixed(1)}%
      </div>
    </div>
  );
}

function CampaignTab() {
  const game = useGame((s) => s.game)!;
  const h = game.history;
  const markers = game.debates.filter((d) => d.done).map((d, i) => ({ x: d.day, label: `D${i + 1}` }));
  const { t, loc, lang } = useT();
  const lbl = (i: number) => dayLabel(game, h[i]?.day ?? 0, false, lang);
  const finalShares = game.result!.popularShare;
  return (
    <div className="campaign-tab">
      <div className="panel section col">
        <div className="panel-title">{t('Poparcie w sondażach (średnia krajowa, %)', 'Poll support (national average, %)')}</div>
        <LineChart
          height={240}
          series={game.candidates.map((c) => ({ id: c.id, label: c.name, color: c.color, values: h.map((x) => x.national[c.id] * (1 - x.undecided) * 100) }))}
          xLabels={lbl}
          markers={markers}
          yFormat={(v) => `${v.toFixed(0)}%`}
        />
        <div className="tiny muted">
          {t('Wynik rzeczywisty', 'Actual result')}: {game.candidates.map((c) => `${c.name} ${(finalShares[c.id] * 100).toFixed(1)}%`).join(' · ')} —{' '}
          {t('różnica względem sondaży to błąd pomiaru i niezdecydowani.', 'the gap versus the polls is polling error plus undecided voters.')}
        </div>
      </div>
      <div className="results-grid two">
        <div className="panel section col">
          <div className="panel-title">{t('Szanse na zwycięstwo (prognoza, %)', 'Win probability (forecast, %)')}</div>
          <LineChart height={200} series={game.candidates.map((c) => ({ id: c.id, label: c.name, color: c.color, values: h.map((x) => x.winProb[c.id] * 100) }))} xLabels={lbl} yMin={0} yMax={100} markers={markers} refLine={50} yFormat={(v) => `${v.toFixed(0)}%`} />
        </div>
        <div className="panel section col">
          <div className="panel-title">{t('Prognozowane głosy elektorskie', 'Projected electoral votes')}</div>
          <LineChart height={200} series={game.candidates.map((c) => ({ id: c.id, label: c.name, color: c.color, values: h.map((x) => x.ev[c.id] ?? 0) }))} xLabels={lbl} yMin={0} yMax={538} refLine={270} markers={markers} />
        </div>
      </div>
      <div className="results-grid two">
        <div className="panel section col">
          <div className="panel-title">{t('Debaty', 'Debates')}</div>
          {game.debates.map((d) => {
            const w = game.candidates.find((c) => c.id === d.winner);
            return (
              <div key={d.id} className="spread small">
                <span>
                  {loc(d.title)} · {dayLabel(game, d.day, false, lang)}
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
            {t('Finanse kampanii', 'Campaign finances')}
          </div>
          <LineChart height={120} series={game.candidates.map((c) => ({ id: c.id, label: `${c.name} — ${t('gotówka', 'cash')}`, color: c.color, values: h.map((x) => x.funds?.[c.id] ?? 0) }))} xLabels={lbl} yMin={0} yFormat={(v) => fmtMoney(v, lang)} />
          {game.candidates.map((c) => (
            <div key={c.id} className="spread small">
              <span style={{ color: c.color }}>{c.name}</span>
              <span className="mono">
                {t('zebrane', 'raised')} {fmtMoney(c.totals.raised, lang)} · {t('wydane', 'spent')} {fmtMoney(c.totals.spent, lang)} · {t('reklamy', 'ads')} {c.totals.adsRun}
              </span>
            </div>
          ))}
        </div>
        <div className="panel section col">
          <div className="panel-title">{t('Kronika kampanii', 'Campaign chronicle')}</div>
          <div className="timeline-list" style={{ maxHeight: 300, overflow: 'auto' }}>
            {game.news
              .filter((n) => n.tone === 'breaking' || n.category === 'debate')
              .slice(0, 30)
              .map((n) => (
                <div key={n.id} className="tl-item" style={{ borderLeftColor: game.candidates.find((c) => c.id === n.candId)?.color ?? 'var(--accent)' }}>
                  <div className="tiny muted">{dayLabel(game, n.day, false, lang)}</div>
                  <div className="small">{loc(n.headline)}</div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SwingStates() {
  const game = useGame((s) => s.game)!;
  const result = game.result!;
  const base = game.baseline;
  const { t, loc } = useT();
  const codes = result.analysis.swingStates.length ? result.analysis.swingStates : STATES.filter((s) => Math.abs(s.lean) < 0.04).map((s) => s.code);
  return (
    <div className="panel section col">
      <div className="panel-title">
        {t('Stany wahające się', 'Swing states')}
        <span className="tiny muted">{t('wynik · zmiana od startu kampanii', 'result · change since campaign launch')}</span>
      </div>
      {codes.map((code) => {
        const r = result.states[code];
        const w = game.candidates.find((c) => c.id === r.winner)!;
        const sorted = Object.entries(r.shares).sort((a, b) => b[1] - a[1]);
        const second = sorted[1][0];
        const margin = sorted[0][1] - sorted[1][1];
        const baseMargin = base ? (base.stateShares[code][w.id] ?? 0) - (base.stateShares[code][second] ?? 0) : 0;
        const flipped = base ? Object.entries(base.stateShares[code]).sort((a, b) => b[1] - a[1])[0][0] !== w.id : false;
        return (
          <div key={code} className="swing-row">
            <span className="win-dot" style={{ background: w.color }} />
            <b className="ellipsis">{loc(stateName(code))}</b>
            <span className="tiny muted">
              {STATE_BY_CODE[code].ev} {t('gł. el.', 'EV')}
            </span>
            <div className="stack-bar">
              {game.candidates.map((c) => (
                <div key={c.id} style={{ width: `${r.shares[c.id] * 100}%`, background: c.color }} />
              ))}
            </div>
            <span className="mono small" style={{ color: w.color }}>
              +{(margin * 100).toFixed(1)}
            </span>
            <span className={`tiny mono ${margin - baseMargin >= 0 ? 'good' : 'bad'}`} title={t('Zmiana przewagi zwycięzcy względem początku kampanii', 'Change in the winner’s margin since the campaign began')}>
              {margin - baseMargin >= 0 ? '▲' : '▼'}
              {Math.abs((margin - baseMargin) * 100).toFixed(1)}
            </span>
            {flipped ? <span className="chip swing">{t('PRZEJĘTY', 'FLIPPED')}</span> : <span />}
          </div>
        );
      })}
    </div>
  );
}

function BigWins() {
  const game = useGame((s) => s.game)!;
  const result = game.result!;
  const { t, loc } = useT();
  return (
    <div className="panel section col">
      <div className="panel-title">{t('Największe zwycięstwa i porażki', 'Biggest wins and losses')}</div>
      <div className="bigwins-grid" style={{ gridTemplateColumns: `repeat(${game.candidates.length}, 1fr)` }}>
        {game.candidates.map((c) => {
          const rows = STATES.map((s) => {
            const sh = result.states[s.code].shares;
            const best = Math.max(...Object.entries(sh).filter(([id]) => id !== c.id).map(([, v]) => v));
            return { code: s.code, m: sh[c.id] - best };
          });
          const wins = rows.filter((r) => r.m > 0).sort((a, b) => b.m - a.m).slice(0, 3);
          const losses = rows.filter((r) => r.m < 0).sort((a, b) => a.m - b.m).slice(0, 3);
          const closest = rows.filter((r) => r.m < 0).sort((a, b) => b.m - a.m)[0];
          return (
            <div key={c.id} className="col" style={{ gap: 4 }}>
              <b style={{ color: c.color }}>{c.name}</b>
              <div className="tiny muted">{t('Najwyższe wygrane', 'Largest wins')}</div>
              {wins.length === 0 && <div className="tiny muted">—</div>}
              {wins.map((r) => (
                <div key={r.code} className="spread small">
                  <span>{loc(stateName(r.code))}</span>
                  <span className="mono good">+{(r.m * 100).toFixed(1)}</span>
                </div>
              ))}
              <div className="tiny muted" style={{ marginTop: 4 }}>
                {t('Najdotkliwsze porażki', 'Heaviest losses')}
              </div>
              {losses.map((r) => (
                <div key={r.code} className="spread small">
                  <span>{loc(stateName(r.code))}</span>
                  <span className="mono bad">{(r.m * 100).toFixed(1)}</span>
                </div>
              ))}
              {closest && (
                <div className="tiny text-2" style={{ marginTop: 4 }}>
                  {t('Najbliżej wygranej', 'Closest to winning')}: <b>{loc(stateName(closest.code))}</b> ({(closest.m * 100).toFixed(1)} {t('pkt', 'pts')})
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GroupsTab() {
  const game = useGame((s) => s.game)!;
  const result = game.result!;
  const base = game.baseline;
  const { t, loc } = useT();
  return (
    <div className="groups-tab">
      <div className="panel section col">
        <div className="panel-title">
          {t('Sondaż powyborczy — jak głosowały grupy wyborców', 'Exit poll — how voter groups voted')}
          <span className="tiny muted">{t('poparcie · frekwencja · zmiana od początku kampanii', 'support · turnout · change since campaign launch')}</span>
        </div>
        {GROUP_SETS.map((set) => (
          <div key={set.label.en} className="col" style={{ gap: 6, marginBottom: 8 }}>
            <div className="tiny display muted" style={{ letterSpacing: '0.1em' }}>
              {loc(set.label).toUpperCase()}
            </div>
            {set.ids.map((g) => {
              const r = result.groups[g];
              const b = base?.groups[g];
              const lead = Object.entries(r.shares).sort((x, y) => y[1] - x[1])[0][0];
              const lc = game.candidates.find((c) => c.id === lead)!;
              const shift = b ? r.shares[lead] - b.shares[lead] : 0;
              return (
                <div key={g} className="exit-row">
                  <span className="small" style={{ fontWeight: 600 }}>
                    {loc(GROUP_LABEL[g])}
                  </span>
                  <div className="stack-bar tall">
                    {game.candidates.map((c) => (
                      <div key={c.id} style={{ width: `${r.shares[c.id] * 100}%`, background: c.color }}>
                        {r.shares[c.id] > 0.12 && <span>{Math.round(r.shares[c.id] * 100)}%</span>}
                      </div>
                    ))}
                  </div>
                  <span className="tiny mono" title={t('Frekwencja w grupie', 'Turnout within the group')}>
                    🗳 {Math.round(r.turnout * 100)}%
                    {b && (
                      <span className={r.turnout - b.turnout >= 0 ? 'good' : 'bad'}>
                        {' '}
                        ({r.turnout - b.turnout >= 0 ? '+' : ''}
                        {((r.turnout - b.turnout) * 100).toFixed(1)})
                      </span>
                    )}
                  </span>
                  <span className={`tiny mono ${shift >= 0 ? 'good' : 'bad'}`} style={{ color: shift >= 0 ? lc.color : undefined }} title={t(`Zmiana poparcia ${lc.name} od startu kampanii`, `Change in support for ${lc.name} since campaign launch`)}>
                    {shift >= 0 ? '▲' : '▼'} {Math.abs(shift * 100).toFixed(1)}
                  </span>
                  <span className="tiny muted mono" title={t('Udział w elektoracie', 'Share of the electorate')}>
                    {Math.round(r.size * 100)}% {t('elektoratu', 'of voters')}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="panel section col">
        <div className="panel-title">{t('Co mówią sondaże powyborcze', 'What the exit polls say')}</div>
        <div className="summary-line" style={{ marginTop: 0 }}>
          {loc(result.analysis.summary)}
        </div>
        <ul className="reason-list">
          {result.analysis.reasons.slice(0, 3).map((r, i) => (
            <li key={i} className="good-li">
              {loc(r)}
            </li>
          ))}
        </ul>
        <div className="tiny muted">
          {t('Frekwencja ogółem', 'Overall turnout')}: {(result.turnout * 100).toFixed(1)}%
          {base ? t(` (prognoza na starcie kampanii: ${(base.turnout * 100).toFixed(1)}%)`, ` (forecast at campaign launch: ${(base.turnout * 100).toFixed(1)}%)`) : ''}.{' '}
          {t('Grupy nakładają się na siebie — ten sam wyborca należy do grupy wiekowej, miejsca zamieszkania, wykształcenia i dochodu.', 'Groups overlap — the same voter belongs to an age group, a place type, an education level and an income bracket.')}
        </div>
      </div>
    </div>
  );
}
