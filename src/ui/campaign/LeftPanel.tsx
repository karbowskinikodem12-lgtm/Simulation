import { useState } from 'react';
import { useGame, type LeftTab } from '../../store/gameStore';
import { PARTIES } from '../../data/parties';
import { ISSUES } from '../../data/issues';
import { PROFILES, TRAIT_META } from '../../data/profiles';
import { stateName } from '../../data/states';
import { Avatar, Delta, AnimatedNumber } from '../components/common';
import { LineChart, Sparkline } from '../charts/LineChart';
import { dayLabel, nationalDelta } from '../selectors';
import { pollAverage, scopeName } from '../../engine/polls';
import { economyIndex } from '../../engine/voterModel';
import { SOCIAL_STRATEGY_META, viralPotential } from '../../engine/social';
import { FUND_LABEL, SPEND_LABEL } from '../../engine/actions';
import { fmtMoney } from '../../engine/util';
import type { Candidate, FundSource, Severity, SocialStrategy, SpendCategory } from '../../engine/types';
import { CandidateModal } from '../modals/CandidateModal';
import { L, type LStr } from '../../i18n';
import { useT } from '../../i18n/useT';

const TABS: { id: LeftTab; icon: string; label: LStr }[] = [
  { id: 'overview', icon: '◉', label: L('Przegląd', 'Overview') },
  { id: 'polls', icon: '📊', label: L('Sondaże', 'Polls') },
  { id: 'media', icon: '📰', label: L('Media', 'Media') },
  { id: 'economy', icon: '💹', label: L('Gospodarka', 'Economy') },
  { id: 'finance', icon: '💰', label: L('Finanse', 'Finance') },
];

export const SWING_SET = ['PA', 'MI', 'WI', 'GA', 'AZ', 'NV', 'NC'];

export function momentumLabel(m: number): { text: LStr; cls: string } {
  if (m >= 0.15) return { text: L('Silny impet ↑↑', 'Strong momentum ↑↑'), cls: 'good' };
  if (m >= 0.05) return { text: L('Rośnie ↑', 'Rising ↑'), cls: 'good' };
  if (m > -0.05) return { text: L('Stabilnie', 'Steady'), cls: 'muted' };
  if (m > -0.15) return { text: L('Słabnie ↓', 'Fading ↓'), cls: 'bad' };
  return { text: L('Załamanie ↓↓', 'Collapsing ↓↓'), cls: 'bad' };
}

export function LeftPanel() {
  const tab = useGame((s) => s.leftTab);
  const setTab = useGame((s) => s.setLeftTab);
  const { loc } = useT();
  return (
    <aside className="side left panel">
      <div className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)} title={loc(t.label)}>
            <span>{t.icon}</span>
            <span className="tab-label">{loc(t.label)}</span>
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
  const { t } = useT();
  return (
    <div className="mom-meter" title={`${t('Impet', 'Momentum')} ${(m * 100).toFixed(0)}`}>
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
  const { t, loc } = useT();

  return (
    <>
      <div className="section col">
        <div className="panel-title">
          {t('Średnia sondaży', 'Polling average')}
          <span className="tiny muted">{avg ? t(`${avg.count} sondaży / 14 dni`, `${avg.count} polls / 14 days`) : t('model', 'model')}</span>
        </div>
        {sortedCands.map((c) => {
          const pct = (avg?.results[c.id] ?? snap.national[c.id] * (1 - und) * 100) as number;
          const spark = game.history.slice(-30).map((h) => h.national[c.id] * 100);
          const ml = momentumLabel(c.momentum);
          return (
            <div key={c.id} className={`cand-row${c.isPlayer ? ' me' : ''}`} onClick={() => setOpen(c)} style={{ cursor: 'pointer' }} title={t('Kliknij, aby zobaczyć profil kandydata', 'Click to view the candidate profile')}>
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
                    {loc(PARTIES[c.party].short)} · {loc(PROFILES[c.profile].label)}
                  </span>
                  <Delta v={nationalDelta(game, c.id)} suffix={t(' pkt/7d', ' pts/7d')} />
                </div>
                <div className="spread" style={{ marginTop: 4 }}>
                  <span className={`tiny ${ml.cls}`}>{loc(ml.text)}</span>
                  <Sparkline values={spark} color={c.color} width={54} height={14} />
                </div>
                <MomentumMeter m={c.momentum} />
                <div className="cand-metrics">
                  <span title={t('Wizerunek netto (sympatia)', 'Net favorability')}>
                    👍 <b className={c.favorability >= 0 ? 'good' : 'bad'}>{c.favorability >= 0 ? '+' : ''}{c.favorability.toFixed(0)}</b>
                  </span>
                  <span title={t('Entuzjazm wyborców', 'Voter enthusiasm')}>🔥 {c.enthusiasm.toFixed(0)}</span>
                  <span title={t('Rozgłos w mediach społecznościowych', 'Social media buzz')}>📱 {c.social.buzz >= 0 ? '+' : ''}{(c.social.buzz * 100).toFixed(0)}</span>
                  <span className="traits-mini">
                    {c.traits.slice(0, 3).map((tr) => (
                      <span key={tr} title={`${loc(TRAIT_META[tr].label)}: ${loc(TRAIT_META[tr].desc)}`}>
                        {TRAIT_META[tr].icon}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div className="tiny muted">
          {t('Niezdecydowani', 'Undecided')}: {(avg?.undecided ?? und * 100).toFixed(1)}% · {t('prognozowana frekwencja', 'projected turnout')} {(snap.turnout * 100).toFixed(0)}%
        </div>
      </div>

      <div className="section col">
        <div className="panel-title">
          {t('Prognoza zwycięstwa', 'Win forecast')}
          <span className="tiny muted">{t('400 symulacji', '400 simulations')}</span>
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
              <span className="tiny muted">
                {t('śr.', 'avg')} {Math.round(game.forecast?.evMean[c.id] ?? 0)} {t('gł. el.', 'EV')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="section col">
        <div className="panel-title">{t('Najważniejsze tematy', 'Top issues')}</div>
        {salience.slice(0, 6).map((iss) => (
          <div key={iss.id} className="salience-row">
            <span className="small ellipsis">
              {iss.icon} {loc(iss.label)}
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
  const { t, loc, lang } = useT();
  const polls = game.polls.filter((p) => (filter === 'all' ? true : filter === 'national' ? p.scope === 'national' : SWING_SET.includes(p.scope))).slice(0, 30);
  return (
    <>
      <div className="section col">
        <div className="panel-title">{t('Średnia krajowa w czasie', 'National average over time')}</div>
        <LineChart
          height={150}
          series={game.candidates.map((c) => ({ id: c.id, label: c.name, color: c.color, values: h.map((x) => x.national[c.id] * (1 - x.undecided) * 100) }))}
          xLabels={(i) => dayLabel(game, h[i]?.day ?? 0, false, lang)}
          markers={game.debates.filter((d) => d.done).map((d, i) => ({ x: h.findIndex((x) => x.day === d.day), label: `D${i + 1}` }))}
          yFormat={(v) => `${v.toFixed(0)}%`}
        />
      </div>
      <div className="section col">
        <div className="panel-title">{t('Stany wahające się (średnia 21 dni)', 'Swing states (21-day average)')}</div>
        <table className="mini-table">
          <tbody>
            {SWING_SET.map((code) => {
              const avg = pollAverage(game, code, 21);
              const est = h[h.length - 1]?.stateEst[code];
              return (
                <tr key={code} onClick={() => selectState(code)}>
                  <td style={{ fontWeight: 700 }}>{loc(stateName(code))}</td>
                  {game.candidates.map((c, i) => (
                    <td key={c.id} className="mono" style={{ color: c.color }}>
                      {avg ? avg.results[c.id].toFixed(0) : est ? (est[i] * 100 * 0.95).toFixed(0) : '–'}
                    </td>
                  ))}
                  <td className="tiny muted">{avg ? t(`${avg.count} sond.`, `${avg.count} polls`) : t('model', 'model')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="section col" style={{ flex: 1, minHeight: 0 }}>
        <div className="panel-title">
          {t('Sondaże', 'Polls')}
          <div className="segmented">
            {(
              [
                ['all', t('Wszystkie', 'All')],
                ['national', t('Kraj', 'National')],
                ['swing', t('Wahające', 'Swing')],
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
                  {loc(scopeName(p.scope))}
                  {SWING_SET.includes(p.scope) && <span className="chip swing" style={{ marginLeft: 4, padding: '0 5px' }}>{t('wahający', 'swing')}</span>}
                </span>
                <span className="muted">{dayLabel(game, p.day, false, lang)}</span>
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

const SEV_META: Record<Severity, { label: LStr | null; cls: string }> = {
  major: { label: L('WAŻNE', 'MAJOR'), cls: 'sev-major' },
  moderate: { label: L('ISTOTNE', 'NOTABLE'), cls: 'sev-moderate' },
  minor: { label: null, cls: 'sev-minor' },
};

function MediaTab() {
  const game = useGame((s) => s.game)!;
  const setSocial = useGame((s) => s.setSocialStrategy);
  const [onlyImportant, setOnlyImportant] = useState(false);
  const player = game.candidates.find((c) => c.id === game.playerId);
  const { t, loc, lang } = useT();
  const news = game.news.filter((n) => !onlyImportant || n.severity !== 'minor').slice(0, 40);
  return (
    <>
      <div className="section col">
        <div className="panel-title">{t('Media społecznościowe', 'Social media')}</div>
        {game.candidates.map((c) => (
          <div key={c.id} className="social-row">
            <span className="ellipsis" style={{ color: c.color, fontWeight: 700 }}>
              {c.name.split(' ').slice(-1)[0]}
            </span>
            <span className="tiny" title={t('Obserwujący', 'Followers')}>
              👥 {c.social.followers.toFixed(1)} {t('mln', 'M')}
            </span>
            <span className="tiny" title={t('Zaangażowanie', 'Engagement')}>
              💬 {c.social.engagement.toFixed(1)}%
            </span>
            <span className={`tiny ${c.social.buzz >= 0 ? 'good' : 'bad'}`} title={t('Rozgłos (impet w sieci)', 'Buzz (online momentum)')}>
              🔥 {c.social.buzz >= 0 ? '+' : ''}
              {(c.social.buzz * 100).toFixed(0)}
            </span>
            <span className="tiny muted" title={t('Potencjał wiralowy', 'Viral potential')}>
              ⚡ {Math.round(viralPotential(c) * 100)}
            </span>
          </div>
        ))}
        {player && (
          <>
            <div className="tiny muted" style={{ marginTop: 4 }}>
              {t('Strategia Twojego zespołu cyfrowego:', 'Your digital team strategy:')}
            </div>
            <div className="strategy-grid">
              {(Object.keys(SOCIAL_STRATEGY_META) as SocialStrategy[]).map((k) => (
                <button key={k} className={`strategy-btn${player.social.strategy === k ? ' on' : ''}`} onClick={() => setSocial(k)} title={loc(SOCIAL_STRATEGY_META[k].desc)}>
                  <span>{SOCIAL_STRATEGY_META[k].icon}</span> {loc(SOCIAL_STRATEGY_META[k].label)}
                </button>
              ))}
            </div>
            <div className="tiny muted">{loc(SOCIAL_STRATEGY_META[player.social.strategy].desc)}</div>
          </>
        )}
      </div>
      <div className="section col" style={{ flex: 1, minHeight: 0 }}>
        <div className="panel-title">
          {t('Wiadomości', 'News')}
          <button className={`btn sm${onlyImportant ? ' active' : ''}`} onClick={() => setOnlyImportant((v) => !v)}>
            {t('Tylko ważne', 'Major only')}
          </button>
        </div>
        <div className="poll-list">
          {news.map((n) => {
            const c = game.candidates.find((x) => x.id === n.candId);
            return (
              <div key={n.id} className={`news-item ${n.tone} ${SEV_META[n.severity].cls}`} style={{ borderLeftColor: c?.color }}>
                <div className="spread tiny muted">
                  <span>{dayLabel(game, n.day, false, lang)}</span>
                  {SEV_META[n.severity].label && <span className={`sev-tag ${SEV_META[n.severity].cls}`}>{loc(SEV_META[n.severity].label)}</span>}
                </div>
                <div className="small" style={{ fontWeight: n.severity === 'minor' ? 500 : 700 }}>
                  {loc(n.headline)}
                </div>
                {n.body && n.severity !== 'minor' && <div className="tiny text-2">{loc(n.body)}</div>}
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
  const { t, loc } = useT();
  const rows: { label: string; value: string; key: keyof typeof e; good: 'up' | 'down' }[] = [
    { label: t('Wzrost PKB', 'GDP growth'), value: `${e.gdp.toFixed(1)}%`, key: 'gdp', good: 'up' },
    { label: t('Inflacja', 'Inflation'), value: `${e.inflation.toFixed(1)}%`, key: 'inflation', good: 'down' },
    { label: t('Bezrobocie', 'Unemployment'), value: `${e.unemployment.toFixed(1)}%`, key: 'unemployment', good: 'down' },
    { label: t('Stopy procentowe (Fed)', 'Interest rate (Fed)'), value: `${e.rate.toFixed(2)}%`, key: 'rate', good: 'down' },
    { label: t('Giełda (indeks)', 'Stock index'), value: e.stocks.toFixed(0), key: 'stocks', good: 'up' },
    { label: t('Benzyna', 'Gas'), value: `$${e.gas.toFixed(2)}`, key: 'gas', good: 'down' },
    { label: t('Zaufanie konsumentów', 'Consumer confidence'), value: `${e.confidence.toFixed(0)}/100`, key: 'confidence', good: 'up' },
  ];
  return (
    <>
      <div className="section col">
        <div className="panel-title">{t('Ocena administracji', 'Administration approval')}</div>
        <div className="spread">
          <div>
            <div className="display" style={{ fontSize: 34, fontWeight: 800, color: game.approval >= 47 ? 'var(--good)' : game.approval < 42 ? 'var(--bad)' : 'var(--warn)' }}>
              {game.approval.toFixed(0)}%
            </div>
            <div className="tiny muted">{t('aprobata prezydenta', 'presidential approval')}</div>
          </div>
          <div className="tiny text-2" style={{ maxWidth: 160, textAlign: 'right' }}>
            {inc ? (
              <>
                {t('Partia rządząca', 'Governing party')}: <b>{loc(PARTIES[inc].short)}</b>.{' '}
                {game.approval >= 47
                  ? t('Dobre notowania pomagają jej kandydatowi.', 'Strong numbers help its candidate.')
                  : game.approval < 42
                    ? t('Słabe notowania ciążą jej kandydatowi.', 'Weak numbers weigh on its candidate.')
                    : t('Notowania neutralne.', 'Approval is neutral.')}
              </>
            ) : (
              t('Brak kandydata partii rządzącej — ocena administracji wpływa słabiej.', 'No governing-party candidate — approval matters less.')
            )}
          </div>
        </div>
      </div>
      <div className="section col">
        <div className="panel-title">
          {t('Wskaźniki', 'Indicators')}
          <span className="chip" style={{ color: econ >= 0 ? 'var(--good)' : 'var(--bad)' }}>
            {econ > 0.25 ? t('Koniunktura', 'Boom') : econ < -0.25 ? t('Spowolnienie', 'Slowdown') : t('Stabilnie', 'Stable')}
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
        <div className="tiny muted">{t('Dane makro zmieniają się codziennie; raporty o pracy i inflacji co miesiąc, posiedzenia Fed co 3 tygodnie.', 'Macro data moves daily; jobs and inflation reports are monthly, Fed meetings every 3 weeks.')}</div>
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
  const { t, loc, lang } = useT();
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
            <div className="tiny muted">{t('Gotówka', 'Cash on hand')}</div>
            <div className="display" style={{ fontSize: 30, fontWeight: 800, color: c.funds < 3 ? 'var(--bad)' : 'var(--good)' }}>
              {fmtMoney(c.funds, lang)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="tiny muted">{t('Bilans 7 dni', '7-day net')}</div>
            <div className={`mono ${netWeek >= 0 ? 'good' : 'bad'}`} style={{ fontWeight: 700 }}>
              {netWeek >= 0 ? '+' : ''}
              {fmtMoney(netWeek, lang)}
            </div>
          </div>
        </div>
        <LineChart height={110} series={[{ id: c.id, label: t('Gotówka ($ mln)', 'Cash ($M)'), color: c.color, values: h.map((x) => x.funds[c.id] ?? 0) }]} xLabels={(i) => dayLabel(game, h[i]?.day ?? 0, false, lang)} yMin={0} />
      </div>
      <div className="section col">
        <div className="panel-title">
          {t('Wpływy', 'Raised')} <span className="mono tiny">{fmtMoney(c.totals.raised, lang)}</span>
        </div>
        {raised.map(([k, v]) => (
          <div key={k} className="fin-row">
            <span className="tiny">{loc(FUND_LABEL[k])}</span>
            <div className="bar grow">
              <div style={{ width: `${(v / maxR) * 100}%`, background: 'var(--good)' }} />
            </div>
            <span className="tiny mono">{fmtMoney(v, lang)}</span>
          </div>
        ))}
      </div>
      <div className="section col">
        <div className="panel-title">
          {t('Wydatki', 'Spent')} <span className="mono tiny">{fmtMoney(c.totals.spent, lang)}</span>
        </div>
        {spent.map(([k, v]) => (
          <div key={k} className="fin-row">
            <span className="tiny">{loc(SPEND_LABEL[k])}</span>
            <div className="bar grow">
              <div style={{ width: `${(v / maxS) * 100}%`, background: 'var(--accent)' }} />
            </div>
            <span className="tiny mono">{fmtMoney(v, lang)}</span>
          </div>
        ))}
        <div className="tiny muted">{t('Stałe koszty sztabu rosną z liczbą biur terenowych. Drobni darczyńcy reagują na rozgłos i impet, duzi — na szanse wygranej.', 'Fixed staff costs grow with the number of field offices. Small donors respond to buzz and momentum, big donors to win chances.')}</div>
      </div>
    </>
  );
}
