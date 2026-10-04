import { useGame } from '../../store/gameStore';
import { APPROACH_META } from '../../data/debateText';
import { ISSUE_BY_ID } from '../../data/issues';
import { APPROACHES, DEBATE_ROUNDS, STRATEGIES, STRATEGY_META } from '../../engine/debate';
import { issueEdge } from '../../engine/voterModel';
import { Avatar, Modal } from '../components/common';

export function DebateModal() {
  const game = useGame((s) => s.game)!;
  const { debatePick, debateFinish, debateClose, debateStrategy } = useGame();
  const live = game.liveDebate;
  if (!live) return null;
  const slot = game.debates.find((d) => d.id === live.slotId)!;
  const parts = live.participants.map((id) => game.candidates.find((c) => c.id === id)!);
  const roundsDone = live.round >= DEBATE_ROUNDS;
  const last = live.rounds[live.rounds.length - 1];
  const topic = !roundsDone ? live.topics[live.round] : null;
  const edge = topic && game.playerId ? issueEdge(game, game.playerId, topic) : 0;
  const totalAll = parts.reduce((a, c) => a + Math.max(1, live.totals[c.id]), 0);
  const report = slot.report;

  return (
    <Modal wide>
      <div className="debate-stage">
        <div className="debate-header">
          <div className="tiny display" style={{ letterSpacing: '0.2em', color: 'var(--accent)' }}>
            {live.stage === 'report' ? 'PO DEBACIE' : 'NA ŻYWO'}
          </div>
          <h2 className="display" style={{ fontSize: 30 }}>
            {slot.title}
          </h2>
          {live.stage !== 'strategy' && (
            <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
              {Array.from({ length: DEBATE_ROUNDS }, (_, i) => (
                <span key={i} className={`round-pip${i < live.round ? ' done' : ''}${i === live.round ? ' now' : ''}`} />
              ))}
            </div>
          )}
        </div>

        {live.stage === 'strategy' && (
          <div className="col" style={{ gap: 12 }}>
            <div className="question-box">
              <div className="tiny display" style={{ letterSpacing: '0.12em', color: 'var(--accent)' }}>
                Odprawa przed debatą
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>Sztab czeka na decyzję: jaką strategię przyjmujesz na dzisiejszy wieczór?</div>
              <div className="tiny muted" style={{ marginTop: 4 }}>
                Spodziewane tematy: {live.topics.map((t) => `${ISSUE_BY_ID[t].icon} ${ISSUE_BY_ID[t].label}`).join(' · ')}
              </div>
            </div>
            <div className="strategy-cards">
              {STRATEGIES.map((st) => (
                <button key={st} className="approach-btn" onClick={() => debateStrategy(st)}>
                  <div style={{ fontSize: 26 }}>{STRATEGY_META[st].icon}</div>
                  <div style={{ fontWeight: 800 }}>{STRATEGY_META[st].label}</div>
                  <div className="tiny muted">{STRATEGY_META[st].desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {live.stage !== 'strategy' && (
          <div className="debate-podiums">
            {parts.map((c) => {
              const share = Math.max(1, live.totals[c.id]) / totalAll;
              const strat = live.strategies[c.id];
              return (
                <div key={c.id} className={`podium${c.isPlayer ? ' me' : ''}`} style={{ borderColor: c.color }}>
                  <Avatar name={c.name} color={c.color} size={64} />
                  <div style={{ fontWeight: 800, marginTop: 6 }}>{c.name}</div>
                  <div className="tiny muted">
                    {strat && (c.isPlayer || live.stage === 'report') ? `${STRATEGY_META[strat].icon} ${STRATEGY_META[strat].label}` : `Przygotowanie ${Math.round(c.debatePrep)}/100`}
                  </div>
                  {report ? (
                    <div className="grade display">{report.grades[c.id]}</div>
                  ) : (
                    <div className="meter">
                      <div style={{ width: `${live.round ? share * 100 : 100 / parts.length}%`, background: c.color }} />
                    </div>
                  )}
                  {last && !report && (
                    <div className="tiny" style={{ marginTop: 6 }}>
                      {APPROACH_META[last.picks[c.id]].icon} {APPROACH_META[last.picks[c.id]].label} · <b className="mono">{last.scores[c.id].toFixed(0)} pkt</b>
                    </div>
                  )}
                  {report && slot.flashPoll && (
                    <div className="small" style={{ marginTop: 4 }}>
                      Sondaż po debacie: <b style={{ color: c.color }}>{slot.flashPoll[c.id]}%</b>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {last && live.stage === 'rounds' && (
          <div className="debate-commentary">
            {last.commentary.map((line, i) => (
              <div key={i} className="small">
                🎙 {line}
              </div>
            ))}
          </div>
        )}

        {live.stage === 'rounds' && !roundsDone && topic && (
          <div className="col" style={{ gap: 10 }}>
            <div className="question-box">
              <div className="tiny display" style={{ letterSpacing: '0.12em', color: 'var(--accent)' }}>
                Runda {live.round + 1} · {ISSUE_BY_ID[topic].icon} {ISSUE_BY_ID[topic].label}
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, marginTop: 4 }}>„{live.questions[live.round]}”</div>
              <div className={`tiny ${edge > 0.1 ? 'good' : edge < -0.1 ? 'bad' : 'muted'}`} style={{ marginTop: 4 }}>
                {edge > 0.1 ? 'Ten temat Ci sprzyja — Twoje stanowisko jest bliższe wyborcom.' : edge < -0.1 ? 'Trudny temat — większość wyborców myśli inaczej niż Ty. Rozważ unik.' : 'Temat neutralny dla Ciebie.'}
              </div>
            </div>
            <div className="approach-grid">
              {APPROACHES.map((a) => (
                <button key={a} className="approach-btn" onClick={() => debatePick(a)}>
                  <div style={{ fontSize: 26 }}>{APPROACH_META[a].icon}</div>
                  <div style={{ fontWeight: 800 }}>{APPROACH_META[a].label}</div>
                  <div className="tiny muted">{APPROACH_META[a].desc}</div>
                  <div className="tiny" style={{ color: 'var(--accent-2)', marginTop: 4 }}>
                    Kontruje: {APPROACH_META[APPROACH_META[a].beats].label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {live.stage === 'rounds' && roundsDone && (
          <div className="col" style={{ alignItems: 'center', gap: 12 }}>
            <div className="display" style={{ fontSize: 22 }}>
              Koniec debaty
            </div>
            <button className="btn primary lg" onClick={debateFinish}>
              Zobacz oceny, reakcje mediów i sondaż →
            </button>
          </div>
        )}

        {live.stage === 'report' && report && (
          <div className="col" style={{ gap: 12 }}>
            <div className="report-grid">
              <div className="col" style={{ gap: 6 }}>
                <div className="panel-title">Reakcje mediów</div>
                {report.headlines.map((h) => (
                  <div key={h.outlet} className="headline-card" style={{ borderLeftColor: h.lean > 0 ? '#ef4444' : h.lean < 0 ? '#3b82f6' : 'var(--accent)' }}>
                    <div className="tiny muted display" style={{ letterSpacing: '0.08em' }}>
                      {h.outlet}
                    </div>
                    <div className="small" style={{ fontWeight: 700 }}>
                      {h.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="col" style={{ gap: 6 }}>
                <div className="panel-title">Wpływ na kampanię</div>
                {game.candidates.map((c) => (
                  <div key={c.id} className="impact-row">
                    <span style={{ color: c.color, fontWeight: 700 }} className="ellipsis">
                      {c.name}
                    </span>
                    <span className={`mono small ${report.pollShift[c.id] >= 0 ? 'good' : 'bad'}`} title="Zmiana w średniej krajowej">
                      {report.pollShift[c.id] >= 0 ? '▲' : '▼'} {Math.abs(report.pollShift[c.id]).toFixed(1)} pkt
                    </span>
                    <span className={`mono small ${report.momentumShift[c.id] >= 0 ? 'good' : 'bad'}`} title="Zmiana momentum">
                      🚀 {report.momentumShift[c.id] >= 0 ? '+' : ''}
                      {(report.momentumShift[c.id] * 100).toFixed(0)}
                    </span>
                  </div>
                ))}
                <div className="tiny muted">Pełny efekt w sondażach pojawi się w ciągu kilku dni — momentum stopniowo wygasa.</div>
              </div>
            </div>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn primary lg" onClick={debateClose}>
                Wróć do kampanii →
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
