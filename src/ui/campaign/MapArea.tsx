import { useMemo } from 'react';
import { useGame, type MapMode } from '../../store/gameStore';
import { USMap } from '../map/USMap';
import { EVBar } from '../charts/EVBar';
import { STATES, STATE_BY_CODE } from '../../data/states';
import { leaderOf } from '../../engine/voterModel';
import { candColor, dayLabel, effortStock, mapFills } from '../selectors';
import { ratingOf, RATING_LABEL, marginFill } from '../colors';
import { TUNING } from '../../engine/config';
import { SCHEDULE_META } from '../../engine/actions';
import { ISSUE_BY_ID } from '../../data/issues';
import type { GameState } from '../../engine/types';
import type { Snapshot } from '../../engine/voterModel';

const MODES: { id: MapMode; label: string }[] = [
  { id: 'projection', label: 'Sondaże' },
  { id: 'winprob', label: 'Szanse' },
  { id: 'presence', label: 'Twoja kampania' },
  { id: 'lean', label: 'Historyczne' },
];

function StateTooltip({ game, snap, code }: { game: GameState; snap: Snapshot; code: string }) {
  const s = STATE_BY_CODE[code];
  const est = snap.states[code].estimate;
  const und = snap.states[code].undecided;
  const l = leaderOf(est);
  const prob = game.forecast?.stateWinProb[code];
  return (
    <div className="col" style={{ gap: 4 }}>
      <div className="spread">
        <b>{s.name}</b>
        <span className="chip">{s.ev} EV</span>
      </div>
      {game.candidates.map((c) => (
        <div key={c.id} className="spread small">
          <span style={{ color: c.color }}>{c.name}</span>
          <span className="mono">
            {(est[c.id] * (1 - und) * 100).toFixed(1)}%{prob ? <span className="muted"> · {Math.round(prob[c.id] * 100)}%</span> : null}
          </span>
        </div>
      ))}
      <div className="tiny muted">
        {RATING_LABEL[ratingOf(l.margin)]} · przewaga {(l.margin * 100).toFixed(1)} pkt
      </div>
    </div>
  );
}

export function MapArea() {
  const game = useGame((s) => s.game)!;
  const snap = useGame((s) => s.snap)!;
  const mode = useGame((s) => s.mapMode);
  const selected = useGame((s) => s.selectedState);
  const { setMapMode, selectState } = useGame();

  const fills = useMemo(() => mapFills(game, snap, mode), [game, snap, mode]);
  const { solid, lean } = useMemo(() => {
    const solid: Record<string, number> = {};
    const lean: Record<string, number> = {};
    for (const s of STATES) {
      const l = leaderOf(snap.states[s.code].estimate);
      const bucket = l.margin >= 0.06 ? solid : lean;
      bucket[l.id] = (bucket[l.id] ?? 0) + s.ev;
    }
    return { solid, lean };
  }, [snap]);
  const total: Record<string, number> = {};
  for (const c of game.candidates) total[c.id] = (solid[c.id] ?? 0) + (lean[c.id] ?? 0);

  const badges = useMemo(() => {
    if (!game.playerId) return undefined;
    const b: Record<string, string> = {};
    const next = game.candidates.find((c) => c.id === game.playerId)!.schedule.find((a) => a.state);
    if (next?.state) b[next.state] = SCHEDULE_META[next.kind].icon;
    return b;
  }, [game]);

  return (
    <section className="map-area">
      <div className="panel ev-panel">
        <EVBar candidates={game.candidates} ev={solid} lean={lean} labels={false} height={18} />
        <div className="spread" style={{ marginTop: 8 }}>
          {game.candidates.map((c) => (
            <div key={c.id} className="row">
              <span className="display" style={{ fontSize: 34, fontWeight: 800, color: c.color, lineHeight: 1 }}>
                {total[c.id]}
              </span>
              <div className="col" style={{ gap: 0 }}>
                <span className="small" style={{ fontWeight: 700 }}>
                  {c.name}
                </span>
                <span className="tiny muted">
                  pewne {solid[c.id] ?? 0} · chwiejne {lean[c.id] ?? 0}
                </span>
              </div>
            </div>
          ))}
        </div>
        <Timeline />
      </div>

      <div className="panel map-panel">
        <div className="map-toolbar">
          <div className="segmented">
            {MODES.filter((m) => m.id !== 'presence' || game.playerId).map((m) => (
              <button key={m.id} className={mode === m.id ? 'on' : ''} onClick={() => setMapMode(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
          <div className="map-legend">
            {mode === 'presence' ? (
              <span className="tiny muted">Intensywność: wiece + reklamy + biura terenowe</span>
            ) : (
              game.candidates.slice(0, 2).map((c) => (
                <div key={c.id} className="row" style={{ gap: 3 }}>
                  {[0.13, 0.08, 0.04, 0.01].map((m) => (
                    <span key={m} className="legend-sw" style={{ background: marginFill(c.color, m) }} />
                  ))}
                  <span className="tiny muted">{c.name.split(' ').slice(-1)[0]}</span>
                </div>
              ))
            )}
            <span className="tiny muted">pewny → remis</span>
          </div>
        </div>
        <div className="map-wrap">
          <USMap
            fills={fills}
            selected={selected}
            onSelect={(c) => selectState(selected === c ? null : c)}
            badges={badges}
            tooltip={(code) => (
              <>
                <StateTooltip game={game} snap={snap} code={code} />
                {mode === 'presence' && game.playerId && <div className="tiny muted">Wysiłek kampanii: {effortStock(game, code, game.playerId).toFixed(1)}</div>}
              </>
            )}
          />
        </div>
      </div>
      <ScheduleStrip />
    </section>
  );
}

function Timeline() {
  const game = useGame((s) => s.game)!;
  const T = game.settings.totalDays;
  const pct = (d: number) => `${(d / T) * 100}%`;
  const early = T - TUNING.earlyVotingDays;
  return (
    <div className="timeline">
      <div className="timeline-track">
        <div className="timeline-early" style={{ left: pct(early), width: pct(TUNING.earlyVotingDays) }} title="Głosowanie przedterminowe" />
        <div className="timeline-fill" style={{ width: pct(game.day) }} />
        {game.debates.map((d) => {
          const winner = d.winner ? candColor(game, d.winner) : undefined;
          return (
            <div key={d.id} className={`timeline-mark${d.done ? ' done' : ''}`} style={{ left: pct(d.day), background: winner }} title={`${d.title} · ${dayLabel(game, d.day)}`}>
              🎙
            </div>
          );
        })}
        <div className="timeline-mark end" style={{ left: '100%' }} title="Dzień wyborów">
          🗳
        </div>
      </div>
      <div className="spread tiny muted" style={{ marginTop: 3 }}>
        <span>{dayLabel(game, 0)}</span>
        <span>głosowanie przedterminowe od {dayLabel(game, early)}</span>
        <span>Wybory: {dayLabel(game, T)}</span>
      </div>
    </div>
  );
}

function ScheduleStrip() {
  const game = useGame((s) => s.game)!;
  const unschedule = useGame((s) => s.unschedule);
  const toggleAutopilot = useGame((s) => s.toggleAutopilot);
  const player = game.candidates.find((c) => c.id === game.playerId);
  if (!player) {
    return (
      <div className="panel schedule-strip">
        <div className="panel-title">Tryb obserwatora</div>
        <div className="small muted">Kandydatami sterują sztaby AI. Ustaw prędkość i obserwuj, jak zmienia się mapa.</div>
      </div>
    );
  }
  const slots = Array.from({ length: TUNING.maxScheduleLength }, (_, i) => player.schedule[i]);
  return (
    <div className="panel schedule-strip">
      <div className="col" style={{ gap: 6, minWidth: 128 }}>
        <div className="panel-title">
          Harmonogram
          <span className="tiny muted" style={{ textTransform: 'none', letterSpacing: 0 }}>
            {player.schedule.length}/{TUNING.maxScheduleLength}
          </span>
        </div>
        <button className={`btn sm${player.autopilot ? ' active' : ''}`} onClick={toggleAutopilot} title="Gdy harmonogram jest pusty, sztab sam planuje wiece i zbiórki (bez wydawania na reklamy).">
          🤖 Autopilot {player.autopilot ? 'wł.' : 'wył.'}
        </button>
      </div>
      <div className="schedule-slots">
        {slots.map((a, i) => (
          <div key={a?.id ?? `empty${i}`} className={`slot${a ? '' : ' empty'}${i === 0 ? ' next' : ''}`}>
            <div className="tiny muted">{i === 0 ? 'Jutro' : dayLabel(game, game.day + i + 1)}</div>
            {a ? (
              <>
                <div className="slot-main">
                  <span>{SCHEDULE_META[a.kind].icon}</span>
                  <span className="ellipsis">{SCHEDULE_META[a.kind].label}</span>
                </div>
                <div className="tiny text-2 ellipsis">{a.state ? STATE_BY_CODE[a.state].name : a.issue ? ISSUE_BY_ID[a.issue].label : ' '}</div>
                <button className="slot-x" onClick={() => unschedule(a.id)} title="Usuń">
                  ×
                </button>
              </>
            ) : (
              <div className="tiny muted" style={{ marginTop: 6 }}>
                {player.autopilot ? 'sztab' : 'wolne'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
