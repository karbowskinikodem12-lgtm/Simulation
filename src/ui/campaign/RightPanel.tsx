import { useState } from 'react';
import { useGame } from '../../store/gameStore';
import { STATE_BY_CODE, REGION_LABEL, DONOR_HUBS } from '../../data/states';
import { ISSUES, ISSUE_BY_ID } from '../../data/issues';
import { TUNING } from '../../engine/config';
import { AD_KIND_LABEL, SCHEDULE_META, adDailyCost, officeCost } from '../../engine/actions';
import { leaderOf, stateIdeals, stateSalience, NATIONAL_IDEAL } from '../../engine/voterModel';
import { pollAverage } from '../../engine/polls';
import { fmtMoney } from '../../engine/util';
import type { AdKind, IssueId, ScheduleKind } from '../../engine/types';
import { ratingOf, RATING_LABEL } from '../colors';
import { battlegrounds, candColor, dayLabel } from '../selectors';
import { Sparkline } from '../charts/LineChart';

export function RightPanel() {
  const selected = useGame((s) => s.selectedState);
  return <aside className="side right panel">{selected ? <StatePanel code={selected} /> : <NationalPanel />}</aside>;
}

function AdForm({ scope }: { scope: string }) {
  const game = useGame((s) => s.game)!;
  const runAd = useGame((s) => s.runAd);
  const player = game.candidates.find((c) => c.id === game.playerId)!;
  const rivals = game.candidates.filter((c) => c.id !== player.id);
  const [kind, setKind] = useState<AdKind>('positive');
  const [days, setDays] = useState(7);
  const [target, setTarget] = useState(rivals[0].id);
  const [issue, setIssue] = useState<IssueId>('economy');
  const cost = adDailyCost(scope) * days;
  return (
    <div className="action-card col">
      <div className="spread">
        <b>📺 Kampania reklamowa</b>
        <span className="tiny muted">{scope === 'national' ? 'cały kraj' : STATE_BY_CODE[scope].name}</span>
      </div>
      <div className="segmented">
        {(Object.keys(AD_KIND_LABEL) as AdKind[]).map((k) => (
          <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
            {k === 'positive' ? 'Pozytywna' : k === 'attack' ? 'Atak' : 'Tematyczna'}
          </button>
        ))}
      </div>
      {kind === 'attack' && (
        <select className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
          {rivals.map((r) => (
            <option key={r.id} value={r.id}>
              Cel: {r.name}
            </option>
          ))}
        </select>
      )}
      {kind === 'issue' && (
        <select className="select" value={issue} onChange={(e) => setIssue(e.target.value as IssueId)}>
          {ISSUES.map((i) => (
            <option key={i.id} value={i.id}>
              {i.icon} {i.label}
            </option>
          ))}
        </select>
      )}
      <div className="spread">
        <div className="segmented">
          {[7, 14].map((d) => (
            <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>
              {d} dni
            </button>
          ))}
        </div>
        <button className="btn sm primary" disabled={player.funds < cost} onClick={() => runAd({ scope, kind, days, targetId: kind === 'attack' ? target : undefined, issue: kind === 'issue' ? issue : undefined })}>
          Emituj · {fmtMoney(cost)}
        </button>
      </div>
      <div className="tiny muted">
        {kind === 'attack' ? 'Obniża poparcie rywala, ale lekko psuje Twój wizerunek.' : kind === 'issue' ? 'Buduje poparcie i podbija znaczenie wybranego tematu.' : 'Buduje rozpoznawalność i poparcie.'}
      </div>
    </div>
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
  const rating = ratingOf(l.margin);
  const prob = game.forecast?.stateWinProb[code];
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
          <span className="chip" style={{ color: candColor(game, l.id) }}>
            {RATING_LABEL[rating]}
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
          Niezdecydowani {(sup.undecided * 100).toFixed(1)}% · {avg ? `średnia z ${avg.count} sondaży` : 'brak świeżych sondaży — estymacja modelu'} · frekwencja 2020: {Math.round(s.turnout * 100)}%
        </div>
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
            <span className="tiny" title="Reklamy">
              📺 {(rt.ads[c.id] ?? 0).toFixed(1)}
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
          <div className="panel-title">Działania w stanie</div>
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
          <AdForm scope={code} />
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
          <ScheduleButton kind="debatePrep" disabledReason={nextDebate ? undefined : 'Brak zaplanowanych debat'} />
          <ScheduleButton kind="rest" />
          <AdForm scope="national" />
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
                {a.kind === 'attack' ? '⚔️' : a.kind === 'issue' ? '📌' : '📺'} {a.scope === 'national' ? 'Cały kraj' : STATE_BY_CODE[a.scope].name}
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
