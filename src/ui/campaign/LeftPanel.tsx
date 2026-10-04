import { useState } from 'react';
import { useGame, type LeftTab } from '../../store/gameStore';
import { PARTIES } from '../../data/parties';
import { ISSUES } from '../../data/issues';
import { PROFILES, TRAIT_META } from '../../data/profiles';
import { STATE_BY_CODE } from '../../data/states';
import { Avatar, Delta, AnimatedNumber } from '../components/common';
import { LineChart, Sparkline } from '../charts/LineChart';
import { dayLabel, nationalDelta } from '../selectors';
import { pollAverage, stateName } from '../../engine/polls';
import { economyIndex } from '../../engine/voterModel';
import { SOCIAL_STRATEGY_META, viralPotential } from '../../engine/social';
import { FUND_LABEL, SPEND_LABEL } from '../../engine/actions';
import { fmtMoney } from '../../engine/util';
import type { Candidate, FundSource, Severity, SocialStrategy, SpendCategory } from '../../engine/types';
import { CandidateModal } from '../modals/CandidateModal';

const TABS: { id: LeftTab; icon: string; label: string }[] = [
  { id: 'overview', icon: '◉', label: 'Przegląd' },
  { id: 'polls', icon: '📊', label: 'Sondaże' },
  { id: 'media', icon: '📰', label: 'Media' },
  { id: 'economy', icon: '💹', label: 'Gospodarka' },
  { id: 'finance', icon: '💰', label: 'Finanse' },
];

export const SWING_SET = ['PA', 'MI', 'WI', 'GA', 'AZ', 'NV', 'NC'];

export function momentumLabel(m: number): { text: string; cls: string } {
  if (m >= 0.15) return { text: 'Silne momentum ↑↑', cls: 'good' };
  if (m >= 0.05) return { text: 'Rośnie ↑', cls: 'good' };
  if (m > -0.05) return { text: 'Stabilnie', cls: 'muted' };
  if (m > -0.15) return { text: 'Słabnie ↓', cls: 'bad' };
  return { text: 'Załamanie ↓↓', cls: 'bad' };
}

export function LeftPanel() {
  const tab = useGame((s) => s.leftTab);
  const setTab = useGame((s) => s.setLeftTab);
  return (
    <aside className="side left panel">
      <div className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)} title={t.label}>
            <span>{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="tab-body">
        {tab === 'overview' && <Overview />}
        {tab === 'polls' && <PollsTab />}
        {tab === 'media' && <MediaTab />}
        {tab === 'economy' && <EconomyTab />}
        {tab === 'finance' && <FinanceTab />}
      </div>
    </aside>
  );
}

function MomentumMeter({ m }: { m: number }) {
  const pct = Math.max(-1, Math.min(1, m / 0.3));
  return (
    <div className="mom-meter" title={`Momentum ${(m * 100).toFixed(0)}`}>
      <div className="mom-zero" />
      <div className="mom-fill" style={{ left: pct >= 0 ? '50%' : `${50 + pct * 50}%`, width: `${Math.abs(pct) * 50}%`, background: pct >= 0 ? 'var(--good)' : 'var(--bad)' }} />
    </div>
  );
}

function Overview() {
  const game = useGame((s) => s.game)!;
  const snap = useGame((s) => s.snap)!;
  const [open, setOpen] = useState<Candidate | null>(null);
  const und = snap.undecided;
  const avg = pollAverage(game, 'national');
  const sortedCands = [...game.candidates].sort((a, b) => snap.national[b.id] - snap.national[a.id]);
  const salience = [...ISSUES].sort((a, b) => snap.salience[b.id] - snap.salience[a.id]);
  const maxSal = Math.max(...Object.values(snap.salience));

  return (
    <>
      <div className="section col">
        <div className="panel-title">
          Średnia sondaży
          <span className="tiny muted">{avg ? `${avg.count} sondaży / 14 dni` : 'model'}</span>
        </div>
        {sortedCands.map((c) => {
          const pct = (avg?.results[c.id] ?? snap.national[c.id] * (1 - und) * 100) as number;
          const spark = game.history.slice(-30).map((h) => h.national[c.id] * 100);
          const ml = momentumLabel(c.momentum);
          return (
            <div key={c.id} className={`cand-row${c.isPlayer ? ' me' : ''}`} onClick={() => setOpen(c)} style={{ cursor: 'pointer' }} title="Kliknij, aby zobaczyć profil kandydata">
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
                <div className="spread" style={{ marginTop: 4 }}>
                  <span className={`tiny ${ml.cls}`}>{ml.text}</span>
                  <Sparkline values={spark} color={c.color} width={54} height={14} />
                </div>
                <MomentumMeter m={c.momentum} />
                <div className="cand-metrics">
                  <span title="Wizerunek netto (favorability)">
                    👍 <b className={c.favorability >= 0 ? 'good' : 'bad'}>{c.favorability >= 0 ? '+' : ''}{c.favorability.toFixed(0)}</b>
                  </span>
                  <span title="Entuzjazm wyborców">🔥 {c.enthusiasm.toFixed(0)}</span>
                  <span title="Buzz w social media">📱 {c.social.buzz >= 0 ? '+' : ''}{(c.social.buzz * 100).toFixed(0)}</span>
                  <span className="traits-mini">
                    {c.traits.slice(0, 3).map((t) => (
                      <span key={t} title={`${TRAIT_META[t].label}: ${TRAIT_META[t].desc}`}>
                        {TRAIT_META[t].icon}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div className="tiny muted">Niezdecydowani: {(avg?.undecided ?? und * 100).toFixed(1)}% · prognozowana frekwencja {(snap.turnout * 100).toFixed(0)}%</div>
      </div>

      <div className="section col">
        <div className="panel-title">
          Prognoza zwycięstwa
          <span className="tiny muted">400 symulacji</span>
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
      {open && <CandidateModal candId={open.id} onClose={() => setOpen(null)} />}
    </>
  );
}

function PollsTab() {
  const game = useGame((s) => s.game)!;
  const selectState = useGame((s) => s.selectState);
  const [filter, setFilter] = useState<'all' | 'national' | 'swing'>('all');
  const h = game.history;
  const polls = game.polls.filter((p) => (filter === 'all' ? true : filter === 'national' ? p.scope === 'national' : SWING_SET.includes(p.scope))).slice(0, 30);
  return (
    <>
      <div className="section col">
        <div className="panel-title">Średnia krajowa w czasie</div>
        <LineChart
          height={150}
          series={game.candidates.map((c) => ({ id: c.id, label: c.name, color: c.color, values: h.map((x) => x.national[c.id] * (1 - x.undecided) * 100) }))}
          xLabels={(i) => dayLabel(game, h[i]?.day ?? 0)}
          markers={game.debates.filter((d) => d.done).map((d, i) => ({ x: h.findIndex((x) => x.day === d.day), label: `D${i + 1}` }))}
          yFormat={(v) => `${v.toFixed(0)}%`}
        />
      </div>
      <div className="section col">
        <div className="panel-title">Swing states (średnia 21 dni)</div>
        <table className="mini-table">
          <tbody>
            {SWING_SET.map((code) => {
              const avg = pollAverage(game, code, 21);
              const est = h[h.length - 1]?.stateEst[code];
              return (
                <tr key={code} onClick={() => selectState(code)}>
                  <td style={{ fontWeight: 700 }}>{STATE_BY_CODE[code].name}</td>
                  {game.candidates.map((c, i) => (
                    <td key={c.id} className="mono" style={{ color: c.color }}>
                      {avg ? avg.results[c.id].toFixed(0) : est ? (est[i] * 100 * 0.95).toFixed(0) : '–'}
                    </td>
                  ))}
                  <td className="tiny muted">{avg ? `${avg.count} sond.` : 'model'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="section col" style={{ flex: 1, minHeight: 0 }}>
        <div className="panel-title">
          Sondaże
          <div className="segmented">
            {(
              [
                ['all', 'Wszystkie'],
                ['national', 'Kraj'],
                ['swing', 'Swing'],
              ] as const
            ).map(([id, l]) => (
              <button key={id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="poll-list">
          {polls.map((p) => (
            <div key={p.id} className="poll-item" onClick={() => p.scope !== 'national' && selectState(p.scope)}>
              <div className="spread tiny">
                <span style={{ fontWeight: 700 }}>
                  {stateName(p.scope)}
                  {SWING_SET.includes(p.scope) && <span className="chip swing" style={{ marginLeft: 4, padding: '0 5px' }}>swing</span>}
                </span>
                <span className="muted">{dayLabel(game, p.day)}</span>
              </div>
              <div className="spread">
                <span className="row" style={{ gap: 10 }}>
                  {game.candidates.map((c) => (
                    <span key={c.id} className="mono small" style={{ color: c.color, fontWeight: 700 }}>
                      {p.results[c.id].toFixed(0)}%
                    </span>
                  ))}
                </span>
                <span className="tiny muted">
                  {p.pollster} · n={p.sample} · ±{p.moe}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const SEV_META: Record<Severity, { label: string; cls: string }> = {
  major: { label: 'WAŻNE', cls: 'sev-major' },
  moderate: { label: 'ISTOTNE', cls: 'sev-moderate' },
  minor: { label: '', cls: 'sev-minor' },
};

function MediaTab() {
  const game = useGame((s) => s.game)!;
  const setSocial = useGame((s) => s.setSocialStrategy);
  const [onlyImportant, setOnlyImportant] = useState(false);
  const player = game.candidates.find((c) => c.id === game.playerId);
  const news = game.news.filter((n) => !onlyImportant || n.severity !== 'minor').slice(0, 40);
  return (
    <>
      <div className="section col">
        <div className="panel-title">Social media</div>
        {game.candidates.map((c) => (
          <div key={c.id} className="social-row">
            <span className="ellipsis" style={{ color: c.color, fontWeight: 700 }}>
              {c.name.split(' ').slice(-1)[0]}
            </span>
            <span className="tiny" title="Obserwujący">
              👥 {c.social.followers.toFixed(1)} mln
            </span>
            <span className="tiny" title="Zaangażowanie">
              💬 {c.social.engagement.toFixed(1)}%
            </span>
            <span className={`tiny ${c.social.buzz >= 0 ? 'good' : 'bad'}`} title="Buzz (momentum w sieci)">
              🔥 {c.social.buzz >= 0 ? '+' : ''}
              {(c.social.buzz * 100).toFixed(0)}
            </span>
            <span className="tiny muted" title="Potencjał viralowy">
              ⚡ {Math.round(viralPotential(c) * 100)}
            </span>
          </div>
        ))}
        {player && (
          <>
            <div className="tiny muted" style={{ marginTop: 4 }}>
              Strategia Twojego zespołu cyfrowego:
            </div>
            <div className="strategy-grid">
              {(Object.keys(SOCIAL_STRATEGY_META) as SocialStrategy[]).map((k) => (
                <button key={k} className={`strategy-btn${player.social.strategy === k ? ' on' : ''}`} onClick={() => setSocial(k)} title={SOCIAL_STRATEGY_META[k].desc}>
                  <span>{SOCIAL_STRATEGY_META[k].icon}</span> {SOCIAL_STRATEGY_META[k].label}
                </button>
              ))}
            </div>
            <div className="tiny muted">{SOCIAL_STRATEGY_META[player.social.strategy].desc}</div>
          </>
        )}
      </div>
      <div className="section col" style={{ flex: 1, minHeight: 0 }}>
        <div className="panel-title">
          Wiadomości
          <button className={`btn sm${onlyImportant ? ' active' : ''}`} onClick={() => setOnlyImportant((v) => !v)}>
            Tylko ważne
          </button>
        </div>
        <div className="poll-list">
          {news.map((n) => {
            const c = game.candidates.find((x) => x.id === n.candId);
            return (
              <div key={n.id} className={`news-item ${n.tone} ${SEV_META[n.severity].cls}`} style={{ borderLeftColor: c?.color }}>
                <div className="spread tiny muted">
                  <span>{dayLabel(game, n.day)}</span>
                  {SEV_META[n.severity].label && <span className={`sev-tag ${SEV_META[n.severity].cls}`}>{SEV_META[n.severity].label}</span>}
                </div>
                <div className="small" style={{ fontWeight: n.severity === 'minor' ? 500 : 700 }}>
                  {n.headline}
                </div>
                {n.body && n.severity !== 'minor' && <div className="tiny text-2">{n.body}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function EconomyTab() {
  const game = useGame((s) => s.game)!;
  const e = game.economy;
  const h = game.econHistory.slice(-60);
  const econ = economyIndex(e);
  const inc = game.settings.incumbentParty;
  const rows: { label: string; value: string; key: keyof typeof e; good: 'up' | 'down' }[] = [
    { label: 'Wzrost PKB', value: `${e.gdp.toFixed(1)}%`, key: 'gdp', good: 'up' },
    { label: 'Inflacja', value: `${e.inflation.toFixed(1)}%`, key: 'inflation', good: 'down' },
    { label: 'Bezrobocie', value: `${e.unemployment.toFixed(1)}%`, key: 'unemployment', good: 'down' },
    { label: 'Stopy procentowe (Fed)', value: `${e.rate.toFixed(2)}%`, key: 'rate', good: 'down' },
    { label: 'Giełda (indeks)', value: e.stocks.toFixed(0), key: 'stocks', good: 'up' },
    { label: 'Benzyna', value: `$${e.gas.toFixed(2)}`, key: 'gas', good: 'down' },
    { label: 'Zaufanie konsumentów', value: `${e.confidence.toFixed(0)}/100`, key: 'confidence', good: 'up' },
  ];
  return (
    <>
      <div className="section col">
        <div className="panel-title">Ocena administracji</div>
        <div className="spread">
          <div>
            <div className="display" style={{ fontSize: 34, fontWeight: 800, color: game.approval >= 47 ? 'var(--good)' : game.approval < 42 ? 'var(--bad)' : 'var(--warn)' }}>
              {game.approval.toFixed(0)}%
            </div>
            <div className="tiny muted">aprobata prezydenta</div>
          </div>
          <div className="tiny text-2" style={{ maxWidth: 160, textAlign: 'right' }}>
            {inc ? (
              <>
                Partia rządząca: <b>{PARTIES[inc].short}</b>. {game.approval >= 47 ? 'Dobre notowania pomagają jej kandydatowi.' : game.approval < 42 ? 'Słabe notowania ciążą jej kandydatowi.' : 'Notowania neutralne.'}
              </>
            ) : (
              'Brak kandydata partii rządzącej — ocena administracji wpływa słabiej.'
            )}
          </div>
        </div>
      </div>
      <div className="section col">
        <div className="panel-title">
          Wskaźniki
          <span className="chip" style={{ color: econ >= 0 ? 'var(--good)' : 'var(--bad)' }}>
            {econ > 0.25 ? 'Koniunktura' : econ < -0.25 ? 'Spowolnienie' : 'Stabilnie'}
          </span>
        </div>
        {rows.map((r) => {
          const vals = h.map((p) => p[r.key] as number);
          const delta = vals.length > 7 ? vals[vals.length - 1] - vals[vals.length - 8] : 0;
          const goodDir = (delta > 0) === (r.good === 'up');
          return (
            <div key={r.key} className="econ-row">
              <span className="small">{r.label}</span>
              <Sparkline values={vals} color={Math.abs(delta) < 1e-6 ? '#8a9bb8' : goodDir ? '#34d399' : '#f87171'} width={70} height={18} />
              <b className="mono small" style={{ width: 62, textAlign: 'right' }}>
                {r.value}
              </b>
            </div>
          );
        })}
        <div className="tiny muted">Dane makro zmieniają się codziennie; raporty o pracy i inflacji co miesiąc, posiedzenia Fed co 3 tygodnie.</div>
      </div>
    </>
  );
}

function FinanceTab() {
  const game = useGame((s) => s.game)!;
  const [sel, setSel] = useState(game.playerId ?? game.candidates[0].id);
  const c = game.candidates.find((x) => x.id === sel)!;
  const h = game.history;
  const netWeek = h.length > 7 ? h[h.length - 1].funds[c.id] - h[h.length - 8].funds[c.id] : 0;
  const raised = Object.entries(c.ledger.raised) as [FundSource, number][];
  const spent = Object.entries(c.ledger.spent) as [SpendCategory, number][];
  const maxR = Math.max(1, ...raised.map(([, v]) => v));
  const maxS = Math.max(1, ...spent.map(([, v]) => v));
  return (
    <>
      <div className="section col">
        <div className="segmented">
          {game.candidates.map((x) => (
            <button key={x.id} className={sel === x.id ? 'on' : ''} onClick={() => setSel(x.id)} style={{ color: sel === x.id ? x.color : undefined }}>
              {x.name.split(' ').slice(-1)[0]}
            </button>
          ))}
        </div>
        <div className="spread">
          <div>
            <div className="tiny muted">Gotówka</div>
            <div className="display" style={{ fontSize: 30, fontWeight: 800, color: c.funds < 3 ? 'var(--bad)' : 'var(--good)' }}>
              {fmtMoney(c.funds)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="tiny muted">Bilans 7 dni</div>
            <div className={`mono ${netWeek >= 0 ? 'good' : 'bad'}`} style={{ fontWeight: 700 }}>
              {netWeek >= 0 ? '+' : ''}
              {fmtMoney(netWeek)}
            </div>
          </div>
        </div>
        <LineChart height={110} series={[{ id: c.id, label: 'Gotówka ($ mln)', color: c.color, values: h.map((x) => x.funds[c.id] ?? 0) }]} xLabels={(i) => dayLabel(game, h[i]?.day ?? 0)} yMin={0} />
      </div>
      <div className="section col">
        <div className="panel-title">
          Wpływy <span className="mono tiny">{fmtMoney(c.totals.raised)}</span>
        </div>
        {raised.map(([k, v]) => (
          <div key={k} className="fin-row">
            <span className="tiny">{FUND_LABEL[k]}</span>
            <div className="bar grow">
              <div style={{ width: `${(v / maxR) * 100}%`, background: 'var(--good)' }} />
            </div>
            <span className="tiny mono">{fmtMoney(v)}</span>
          </div>
        ))}
      </div>
      <div className="section col">
        <div className="panel-title">
          Wydatki <span className="mono tiny">{fmtMoney(c.totals.spent)}</span>
        </div>
        {spent.map(([k, v]) => (
          <div key={k} className="fin-row">
            <span className="tiny">{SPEND_LABEL[k]}</span>
            <div className="bar grow">
              <div style={{ width: `${(v / maxS) * 100}%`, background: 'var(--accent)' }} />
            </div>
            <span className="tiny mono">{fmtMoney(v)}</span>
          </div>
        ))}
        <div className="tiny muted">Stałe koszty sztabu rosną z liczbą biur terenowych. Drobni darczyńcy reagują na buzz i momentum, duzi — na szanse wygranej.</div>
      </div>
    </>
  );
}
