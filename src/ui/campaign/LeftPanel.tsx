import { useGame } from '../../store/gameStore';
import { PARTIES } from '../../data/parties';
import { ISSUES } from '../../data/issues';
import { PROFILES } from '../../data/profiles';
import { Avatar, Delta, AnimatedNumber } from '../components/common';
import { Sparkline } from '../charts/LineChart';
import { nationalDelta } from '../selectors';
import { pollAverage, stateName } from '../../engine/polls';
import { economyIndex } from '../../engine/voterModel';

export function LeftPanel() {
  const game = useGame((s) => s.game)!;
  const snap = useGame((s) => s.snap)!;
  const selectState = useGame((s) => s.selectState);
  const und = snap.undecided;
  const avg = pollAverage(game, 'national');
  const sortedCands = [...game.candidates].sort((a, b) => snap.national[b.id] - snap.national[a.id]);
  const e = game.economy;
  const econ = economyIndex(e);
  const salience = [...ISSUES].sort((a, b) => snap.salience[b.id] - snap.salience[a.id]);
  const maxSal = Math.max(...Object.values(snap.salience));

  return (
    <aside className="side left panel">
      <div className="section col">
        <div className="panel-title">
          Średnia sondaży
          <span className="tiny muted">{avg ? `${avg.count} sondaży / 14 dni` : 'model'}</span>
        </div>
        {sortedCands.map((c) => {
          const pct = (avg?.results[c.id] ?? snap.national[c.id] * (1 - und) * 100) as number;
          const spark = game.history.slice(-30).map((h) => h.national[c.id] * 100);
          return (
            <div key={c.id} className={`cand-row${c.isPlayer ? ' me' : ''}`}>
              <Avatar name={c.name} color={c.color} size={38} />
              <div className="grow">
                <div className="spread">
                  <span className="ellipsis" style={{ fontWeight: 700 }}>
                    {c.name}
                    {c.isPlayer && <span style={{ color: 'var(--accent)' }}> ★</span>}
                  </span>
                  <span className="display" style={{ fontSize: 22, fontWeight: 800, color: c.color }}>
                    <AnimatedNumber value={pct} digits={1} suffix="%" />
                  </span>
                </div>
                <div className="spread">
                  <span className="tiny muted">
                    {PARTIES[c.party].short} · {PROFILES[c.profile].label}
                  </span>
                  <Delta v={nationalDelta(game, c.id)} suffix=" pkt/7d" />
                </div>
                <div className="cand-metrics">
                  <span title="Wizerunek netto (favorability)">
                    👍 <b className={c.favorability >= 0 ? 'good' : 'bad'}>{c.favorability >= 0 ? '+' : ''}{c.favorability.toFixed(0)}</b>
                  </span>
                  <span title="Momentum medialne">
                    🚀 <b className={c.momentum >= 0 ? 'good' : 'bad'}>{c.momentum >= 0 ? '+' : ''}{(c.momentum * 100).toFixed(0)}</b>
                  </span>
                  <span title="Entuzjazm wyborców">🔥 {c.enthusiasm.toFixed(0)}</span>
                  <Sparkline values={spark} color={c.color} width={54} height={16} />
                </div>
              </div>
            </div>
          );
        })}
        <div className="tiny muted">Niezdecydowani: {(avg?.undecided ?? und * 100).toFixed(1)}%</div>
      </div>

      <div className="section col">
        <div className="panel-title">
          Prognoza zwycięstwa
          <span className="tiny muted">{400} symulacji</span>
        </div>
        <div className="winprob">
          {game.candidates.map((c) => {
            const p = game.forecast?.winProb[c.id] ?? 0;
            return <div key={c.id} style={{ width: `${p * 100}%`, background: c.color }} title={`${c.name}: ${(p * 100).toFixed(0)}%`} />;
          })}
        </div>
        <div className="spread">
          {game.candidates.map((c) => (
            <div key={c.id} className="col" style={{ gap: 0, alignItems: 'center' }}>
              <span className="display" style={{ fontSize: 20, fontWeight: 800, color: c.color }}>
                {Math.round((game.forecast?.winProb[c.id] ?? 0) * 100)}%
              </span>
              <span className="tiny muted">śr. {Math.round(game.forecast?.evMean[c.id] ?? 0)} EV</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section col">
        <div className="panel-title">Najważniejsze tematy</div>
        {salience.slice(0, 6).map((iss) => (
          <div key={iss.id} className="salience-row">
            <span className="small ellipsis">
              {iss.icon} {iss.label}
            </span>
            <div className="bar grow">
              <div style={{ width: `${(snap.salience[iss.id] / maxSal) * 100}%`, background: 'linear-gradient(90deg, #f0b84a, #f59e0b)' }} />
            </div>
            <span className="tiny mono muted" style={{ width: 30, textAlign: 'right' }}>
              {(snap.salience[iss.id] * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      <div className="section col">
        <div className="panel-title">
          Gospodarka
          <span className="chip" style={{ color: econ >= 0 ? 'var(--good)' : 'var(--bad)' }}>
            Nastroje {Math.round(e.confidence)}/100
          </span>
        </div>
        <div className="econ-grid">
          <div>
            <div className="tiny muted">PKB</div>
            <b className="mono">{e.gdp.toFixed(1)}%</b>
          </div>
          <div>
            <div className="tiny muted">Inflacja</div>
            <b className="mono">{e.inflation.toFixed(1)}%</b>
          </div>
          <div>
            <div className="tiny muted">Bezrobocie</div>
            <b className="mono">{e.unemployment.toFixed(1)}%</b>
          </div>
          <div>
            <div className="tiny muted">Benzyna</div>
            <b className="mono">${e.gas.toFixed(2)}</b>
          </div>
        </div>
      </div>

      <div className="section col" style={{ flex: 1, minHeight: 0 }}>
        <div className="panel-title">Najnowsze sondaże</div>
        <div className="poll-list">
          {game.polls.slice(0, 14).map((p) => (
            <div key={p.id} className="poll-item" onClick={() => p.scope !== 'national' && selectState(p.scope)}>
              <div className="spread tiny">
                <span style={{ fontWeight: 700 }}>{stateName(p.scope)}</span>
                <span className="muted">
                  {p.pollster} · n={p.sample}
                </span>
              </div>
              <div className="row" style={{ gap: 10 }}>
                {game.candidates.map((c) => (
                  <span key={c.id} className="mono small" style={{ color: c.color, fontWeight: 700 }}>
                    {p.results[c.id].toFixed(0)}%
                  </span>
                ))}
                <span className="tiny muted mono">±{p.moe}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
