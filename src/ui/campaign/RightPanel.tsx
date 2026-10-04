import { useState } from 'react';
import { useGame } from '../../store/gameStore';
import { STATE_BY_CODE, REGION_LABEL, DONOR_HUBS } from '../../data/states';
import { ISSUES, ISSUE_BY_ID } from '../../data/issues';
import { TUNING } from '../../engine/config';
import { AD_KIND_LABEL, SCHEDULE_META, mediaIntensity, officeCost, saturation, suggestedBudget, travelCost } from '../../engine/actions';
import { leaderOf, rateState, stateIdeals, stateSalience, NATIONAL_IDEAL } from '../../engine/voterModel';
import { pollAverage } from '../../engine/polls';
import { fmtMoney } from '../../engine/util';
import type { AdChannel, AdKind, IssueId, ScheduleKind } from '../../engine/types';
import { RATING_COLORS } from '../colors';
import { GROUP_LABEL } from '../../engine/groups';
import type { GroupId } from '../../engine/types';

const STATE_GROUPS: GroupId[] = ['young', 'senior', 'city', 'suburb', 'rural', 'college', 'noncollege', 'independent'];
import { battlegrounds, candColor, dayLabel } from '../selectors';
import { Sparkline } from '../charts/LineChart';

export function RightPanel() {
  const selected = useGame((s) => s.selectedState);
  return <aside className="side right panel">{selected ? <StatePanel code={selected} /> : <NationalPanel />}</aside>;
}

const AMOUNTS = [0.5, 1, 2.5, 5, 10, 20];

function MediaBuyForm({ scope }: { scope: string }) {
  const game = useGame((s) => s.game)!;
  const runMedia = useGame((s) => s.runMedia);
  const player = game.candidates.find((c) => c.id === game.playerId)!;
  const rivals = game.candidates.filter((c) => c.id !== player.id);
  const channels: AdChannel[] = scope === 'national' ? ['tv', 'digital'] : ['tv', 'digital', 'canvass'];
  const [channel, setChannel] = useState<AdChannel>('tv');
  const [kind, setKind] = useState<AdKind>('positive');
  const [days, setDays] = useState(7);
  const [amount, setAmount] = useState(() => suggestedBudget('tv', scope));
  const [target, setTarget] = useState(rivals[0].id);
  const [issue, setIssue] = useState<IssueId>('economy');
  const ch = channels.includes(channel) ? channel : 'tv';
  const intensity = mediaIntensity(player, ch, scope, amount, days);
  const ref = mediaIntensity(player, ch, scope, suggestedBudget(ch, scope, days), days);
  const sat = saturation(game, player.id, ch, scope);
  const perMillion = intensity / Math.max(0.1, amount);
  const where = scope === 'national' ? 'w całym kraju' : `w stanie ${STATE_BY_CODE[scope].name}`;
  return (
    <div className="action-card col">
      <div className="spread">
        <b>💸 Wydatki kampanii</b>
        <span className="tiny muted">{scope === 'national' ? 'cały kraj' : STATE_BY_CODE[scope].name}</span>
      </div>
      <div className="segmented">
        {channels.map((c) => (
          <button
            key={c}
            className={ch === c ? 'on' : ''}
            onClick={() => {
              setChannel(c);
              setAmount(suggestedBudget(c, scope, days));
              if (c === 'canvass') setKind('positive');
            }}
          >
            {c === 'tv' ? '📺 TV' : c === 'digital' ? '📱 Internet' : '🚪 Door-to-door'}
          </button>
        ))}
      </div>
      {ch !== 'canvass' && (
        <div className="segmented">
          {(Object.keys(AD_KIND_LABEL) as AdKind[]).map((k) => (
            <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
              {k === 'positive' ? 'Pozytywna' : k === 'attack' ? 'Atak' : 'Tematyczna'}
            </button>
          ))}
        </div>
      )}
      {ch !== 'canvass' && kind === 'attack' && (
        <select className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
          {rivals.map((r) => (
            <option key={r.id} value={r.id}>
              Cel: {r.name}
            </option>
          ))}
        </select>
      )}
      {ch !== 'canvass' && kind === 'issue' && (
        <select className="select" value={issue} onChange={(e) => setIssue(e.target.value as IssueId)}>
          {ISSUES.map((i) => (
            <option key={i.id} value={i.id}>
              {i.icon} {i.label}
            </option>
          ))}
        </select>
      )}
      <div className="col" style={{ gap: 4 }}>
        <div className="spread tiny">
          <span className="muted">Budżet</span>
          <b className="mono" style={{ fontSize: 14 }}>
            {fmtMoney(amount)}
          </b>
        </div>
        <input type="range" className="money-range" min={0.2} max={Math.max(1, Math.min(40, Math.floor(player.funds)))} step={0.1} value={Math.min(amount, Math.max(1, player.funds))} onChange={(e) => setAmount(Number(e.target.value))} />
        <div className="row wrap" style={{ gap: 4 }}>
          {AMOUNTS.map((a) => (
            <button key={a} className={`btn sm${Math.abs(amount - a) < 0.05 ? ' active' : ''}`} disabled={a > player.funds} onClick={() => setAmount(a)}>
              ${a}M
            </button>
          ))}
        </div>
      </div>
      <div className="spread">
        <div className="segmented">
          {[7, 14].map((d) => (
            <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>
              {d} dni
            </button>
          ))}
        </div>
        <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
          <span className="tiny muted">Siła oddziaływania</span>
          <EffectPips value={intensity / Math.max(0.01, ref)} />
        </div>
      </div>
      <div className="tiny muted">
        {sat > 0.5 ? '⚠️ Rynek mocno nasycony — kolejne wydatki dadzą niewiele. ' : ''}
        Efekt maleje z każdym kolejnym milionem ({(perMillion * 100).toFixed(0)} pkt/1 mln). {ch === 'canvass' ? 'Door-to-door głównie mobilizuje Twoich wyborców do pójścia na wybory.' : ch === 'digital' ? 'Internet trafia głównie do młodszych wyborców.' : 'Telewizja najlepiej trafia do starszych wyborców.'}
      </div>
      <button
        className="btn primary"
        disabled={player.funds < amount}
        onClick={() => runMedia({ channel: ch, scope, kind: ch === 'canvass' ? 'positive' : kind, amount, days, targetId: kind === 'attack' ? target : undefined, issue: kind === 'issue' ? issue : undefined })}
      >
        Wydaj {fmtMoney(amount)} {where}
      </button>
    </div>
  );
}

function EffectPips({ value }: { value: number }) {
  const n = Math.max(0, Math.min(5, Math.round(value * 2.5)));
  return (
    <span className="pips">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < n ? 'on' : ''} />
      ))}
    </span>
  );
}

function ScheduleButton({ kind, state, issue, disabledReason }: { kind: ScheduleKind; state?: string; issue?: IssueId; disabledReason?: string }) {
  const schedule = useGame((s) => s.schedule);
  const player = useGame((s) => s.game!.candidates.find((c) => c.id === s.game!.playerId)!);
  const meta = SCHEDULE_META[kind];
  const full = player.schedule.length >= TUNING.maxScheduleLength;
  return (
    <button className="action-btn" disabled={full || !!disabledReason} onClick={() => schedule(kind, { state, issue })} title={disabledReason ?? meta.hint}>
      <span className="action-icon">{meta.icon}</span>
      <span className="grow" style={{ textAlign: 'left' }}>
        <span style={{ fontWeight: 700, display: 'block' }}>{meta.label}</span>
        <span className="tiny muted">{meta.hint}</span>
      </span>
      <span className="tiny muted mono" style={{ textAlign: 'right' }}>
        {meta.cost > 0 && <div>{fmtMoney(meta.cost)}</div>}
        {meta.stamina !== 0 && <div>{meta.stamina > 0 ? `-${meta.stamina}` : `+${-meta.stamina}`} kond.</div>}
      </span>
    </button>
  );
}

function StatePanel({ code }: { code: string }) {
  const game = useGame((s) => s.game)!;
  const snap = useGame((s) => s.snap)!;
  const { selectState, buildOffice } = useGame();
  const s = STATE_BY_CODE[code];
  const sup = snap.states[code];
  const l = leaderOf(sup.estimate);
  const prob = game.forecast?.stateWinProb[code];
  const rating = rateState(game, sup.estimate);
  const leadProb = prob ? Math.max(...Object.values(prob)) : 0.5;
  const competitiveness = leadProb < 0.7 ? { t: 'bardzo wysoka', c: 'var(--accent)' } : leadProb < 0.85 ? { t: 'wysoka', c: 'var(--warn)' } : leadProb < 0.97 ? { t: 'umiarkowana', c: 'var(--text-2)' } : { t: 'niska', c: 'var(--muted)' };
  const avg = pollAverage(game, code, 21);
  const player = game.candidates.find((c) => c.id === game.playerId);
  const rt = game.states[code];
  const sal = stateSalience(code, snap.salience);
  const topIssues = [...ISSUES].sort((a, b) => sal[b.id] - sal[a.id]).slice(0, 4);
  const ideals = stateIdeals(code);
  const recentPolls = game.polls.filter((p) => p.scope === code).slice(0, 4);
  const focusIdx = player ? game.candidates.indexOf(player) : 0;
  const trend = game.history.slice(-30).map((h) => {
    const arr = h.stateEst[code];
    const others = arr.filter((_, i) => i !== focusIdx);
    return (arr[focusIdx] - Math.max(...others)) * 100;
  });
  const offices = player ? rt.offices[player.id] ?? 0 : 0;

  return (
    <div className="col" style={{ gap: 0, height: '100%', overflow: 'auto' }}>
      <div className="section state-head" style={{ background: `linear-gradient(135deg, ${candColor(game, l.id)}40, transparent)` }}>
        <div className="spread">
          <div>
            <div className="tiny muted display" style={{ letterSpacing: '0.1em' }}>
              {REGION_LABEL[s.region]}
            </div>
            <h2 className="display" style={{ fontSize: 28, lineHeight: 1.05 }}>
              {s.name}
            </h2>
          </div>
          <button className="btn sm ghost" onClick={() => selectState(null)}>
            ✕
          </button>
        </div>
        <div className="row wrap" style={{ marginTop: 6 }}>
          <span className="chip">{s.ev} głosów elektorskich</span>
          <span className="chip" style={{ color: '#fff', background: RATING_COLORS[rating.key], borderColor: 'transparent' }}>
            {rating.label}
          </span>
          {l.margin < 0.06 && <span className="chip swing">SWING STATE</span>}
          {s.districts && <span className="chip">Podział głosów wg okręgów</span>}
          {DONOR_HUBS.has(code) && <span className="chip">💰 centrum darczyńców</span>}
        </div>
      </div>

      <div className="section col">
        <div className="panel-title">
          Poparcie (sondaże)
          <Sparkline values={trend} color={player?.color ?? game.candidates[0].color} width={70} height={18} />
        </div>
        {game.candidates.map((c) => {
          const v = (avg?.results[c.id] ?? sup.estimate[c.id] * (1 - sup.undecided) * 100) as number;
          return (
            <div key={c.id} className="col" style={{ gap: 3 }}>
              <div className="spread small">
                <span style={{ color: c.color, fontWeight: 700 }}>{c.name}</span>
                <span className="mono">
                  <b>{v.toFixed(1)}%</b>
                  {prob && <span className="muted"> · szansa {Math.round(prob[c.id] * 100)}%</span>}
                </span>
              </div>
              <div className="bar" style={{ height: 8 }}>
                <div style={{ width: `${v}%`, background: c.color }} />
              </div>
            </div>
          );
        })}
        <div className="tiny muted">
          Niezdecydowani {(sup.undecided * 100).toFixed(1)}% · {avg ? `średnia z ${avg.count} sondaży` : 'brak świeżych sondaży — estymacja modelu'}
        </div>
        <div className="state-kpis">
          <div>
            <div className="tiny muted">Konkurencyjność</div>
            <b style={{ color: competitiveness.c }}>{competitiveness.t}</b>
          </div>
          <div>
            <div className="tiny muted">Prognozowana frekwencja</div>
            <b>{Math.round(sup.turnout * 100)}%</b> <span className="tiny muted">(2020: {Math.round(s.turnout * 100)}%)</span>
          </div>
        </div>
      </div>

      <div className="section col">
        <div className="panel-title">Grupy wyborców</div>
        {STATE_GROUPS.map((g) => (
          <div key={g} className="group-row">
            <span className="tiny ellipsis" title={GROUP_LABEL[g]}>
              {GROUP_LABEL[g]}
            </span>
            <div className="stack-bar">
              {game.candidates.map((c) => (
                <div key={c.id} style={{ width: `${sup.groupsEst[g][c.id] * 100}%`, background: c.color }} title={`${c.name}: ${(sup.groupsEst[g][c.id] * 100).toFixed(0)}%`} />
              ))}
            </div>
            <span className="tiny mono muted" style={{ width: 34, textAlign: 'right' }} title="Udział w elektoracie stanu">
              {Math.round(sup.groups[g].size * 100)}%
            </span>
          </div>
        ))}
        <div className="tiny muted">Paski: poparcie w grupie · liczba: udział grupy wśród dorosłych mieszkańców.</div>
      </div>

      <div className="section col">
        <div className="panel-title">Kluczowe tematy w stanie</div>
        {topIssues.map((iss) => {
          const myPos = player?.positions[iss.id];
          const dist = myPos !== undefined ? Math.abs(myPos - ideals[iss.id]) : null;
          return (
            <div key={iss.id} className="spread small">
              <span>
                {iss.icon} {iss.label}
              </span>
              {dist !== null ? (
                <span className={`tiny ${dist < 25 ? 'good' : dist > 55 ? 'bad' : 'muted'}`}>{dist < 25 ? 'zgodne z Tobą' : dist > 55 ? 'daleko od Ciebie' : 'częściowo zgodne'}</span>
              ) : (
                <span className="tiny muted">{(sal[iss.id] * 100).toFixed(0)}%</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="section col">
        <div className="panel-title">Obecność kampanii</div>
        {game.candidates.map((c) => (
          <div key={c.id} className="presence-row">
            <span className="ellipsis" style={{ color: c.color, width: 92 }}>
              {c.name.split(' ').slice(-1)[0]}
            </span>
            <span className="tiny" title="Wiece i wizyty">
              📣 {(rt.presence[c.id] ?? 0).toFixed(1)}
            </span>
            <span className="tiny" title="Reklamy TV">
              📺 {(rt.ads[c.id] ?? 0).toFixed(1)}
            </span>
            <span className="tiny" title="Kampania internetowa">
              📱 {(rt.digital[c.id] ?? 0).toFixed(1)}
            </span>
            <span className="tiny" title="Door-to-door">
              🚪 {(rt.canvass[c.id] ?? 0).toFixed(1)}
            </span>
            <span className="tiny" title="Biura terenowe">
              🏢 {'●'.repeat(rt.offices[c.id] ?? 0)}
              <span className="muted">{'○'.repeat(TUNING.maxOffices - (rt.offices[c.id] ?? 0))}</span>
            </span>
          </div>
        ))}
      </div>

      {player && (
        <div className="section col">
          <div className="panel-title">
            Działania w stanie
            <span className="tiny muted" style={{ textTransform: 'none', letterSpacing: 0 }}>
              podróż z {STATE_BY_CODE[player.location]?.code ?? '—'}: {fmtMoney(travelCost(player.location, code))}
            </span>
          </div>
          <ScheduleButton kind="rally" state={code} />
          <ScheduleButton kind="townhall" state={code} />
          <ScheduleButton kind="fundraiser" state={code} />
          <div className="action-card spread">
            <div>
              <b>🏢 Biuro terenowe</b>
              <div className="tiny muted">Stała obecność + mobilizacja w dniu wyborów. Poziom {offices}/{TUNING.maxOffices}.</div>
            </div>
            <button className="btn sm" disabled={offices >= TUNING.maxOffices || player.funds < officeCost(code)} onClick={() => buildOffice(code)}>
              Otwórz · {fmtMoney(officeCost(code))}
            </button>
          </div>
          <MediaBuyForm scope={code} />
        </div>
      )}

      {recentPolls.length > 0 && (
        <div className="section col">
          <div className="panel-title">Sondaże w stanie</div>
          {recentPolls.map((p) => (
            <div key={p.id} className="spread tiny">
              <span className="muted">
                {dayLabel(game, p.day)} · {p.pollster}
              </span>
              <span className="row" style={{ gap: 8 }}>
                {game.candidates.map((c) => (
                  <b key={c.id} style={{ color: c.color }}>
                    {p.results[c.id].toFixed(0)}
                  </b>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NationalPanel() {
  const game = useGame((s) => s.game)!;
  const snap = useGame((s) => s.snap)!;
  const selectState = useGame((s) => s.selectState);
  const player = game.candidates.find((c) => c.id === game.playerId);
  const [issue, setIssue] = useState<IssueId>(() => {
    if (!player) return 'economy';
    return [...ISSUES].sort((a, b) => Math.abs(player.positions[a.id] - NATIONAL_IDEAL[a.id]) - Math.abs(player.positions[b.id] - NATIONAL_IDEAL[b.id]))[0].id;
  });
  const bg = battlegrounds(snap);
  const myAds = player ? game.ads.filter((a) => a.candId === player.id) : [];
  const nextDebate = game.debates.find((d) => !d.done);

  return (
    <div className="col" style={{ gap: 0, height: '100%', overflow: 'auto' }}>
      {player ? (
        <div className="section col">
          <div className="panel-title">Działania ogólnokrajowe</div>
          <div className="tiny muted">Kliknij stan na mapie, aby zaplanować wiec, reklamę lub biuro terenowe.</div>
          <div className="row">
            <select className="select" value={issue} onChange={(e) => setIssue(e.target.value as IssueId)}>
              {ISSUES.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.icon} {i.label}
                </option>
              ))}
            </select>
          </div>
          <ScheduleButton kind="speech" issue={issue} />
          <ScheduleButton kind="interview" />
          <ScheduleButton kind="socialBlitz" />
          <ScheduleButton kind="debatePrep" disabledReason={nextDebate ? undefined : 'Brak zaplanowanych debat'} />
          <ScheduleButton kind="rest" />
          <MediaBuyForm scope="national" />
        </div>
      ) : (
        <div className="section col">
          <div className="panel-title">Tryb obserwatora</div>
          <div className="small text-2">Sztaby AI prowadzą kampanie. Kliknij stan, aby zobaczyć szczegóły.</div>
        </div>
      )}

      {player && (
        <div className="section col">
          <div className="panel-title">
            Przygotowanie do debaty
            <span className="mono tiny">{Math.round(player.debatePrep)}/100</span>
          </div>
          <div className="bar">
            <div style={{ width: `${player.debatePrep}%`, background: 'var(--accent-2)' }} />
          </div>
          {nextDebate && (
            <div className="tiny muted">
              {nextDebate.title}: {dayLabel(game, nextDebate.day)} (za {nextDebate.day - game.day} dni)
            </div>
          )}
        </div>
      )}

      <div className="section col">
        <div className="panel-title">Pole bitwy — swing states</div>
        {bg.length === 0 && <div className="tiny muted">Brak wyrównanych stanów.</div>}
        {bg.map(({ s, l }) => (
          <button key={s.code} className="bg-row" onClick={() => selectState(s.code)}>
            <span className="bg-code display" style={{ background: candColor(game, l.id) }}>
              {s.code}
            </span>
            <span className="grow ellipsis" style={{ textAlign: 'left' }}>
              {s.name}
            </span>
            <span className="tiny muted">{s.ev} EV</span>
            <span className="tiny mono" style={{ color: candColor(game, l.id), width: 44, textAlign: 'right' }}>
              +{(l.margin * 100).toFixed(1)}
            </span>
          </button>
        ))}
      </div>

      {myAds.length > 0 && (
        <div className="section col">
          <div className="panel-title">Twoje aktywne reklamy</div>
          {myAds.map((a) => (
            <div key={a.id} className="spread tiny">
              <span>
                {a.channel === 'canvass' ? '🚪' : a.channel === 'digital' ? '📱' : a.kind === 'attack' ? '⚔️' : '📺'} {a.scope === 'national' ? 'Cały kraj' : STATE_BY_CODE[a.scope].name}
                {a.issue ? ` · ${ISSUE_BY_ID[a.issue].short}` : ''}
              </span>
              <span className="muted">{a.daysLeft} dni</span>
            </div>
          ))}
        </div>
      )}

      <div className="section col">
        <div className="panel-title">Debaty</div>
        {game.debates.map((d) => (
          <div key={d.id} className="spread small">
            <span>{d.title}</span>
            {d.done ? (
              <span style={{ color: candColor(game, d.winner!) }}>
                🏆 {game.candidates.find((c) => c.id === d.winner)?.name.split(' ').slice(-1)[0]} ({d.flashPoll?.[d.winner!]}%)
              </span>
            ) : (
              <span className="tiny muted">{dayLabel(game, d.day)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
