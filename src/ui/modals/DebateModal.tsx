import { useGame } from '../../store/gameStore';
import { APPROACH_META } from '../../data/debateText';
import { ISSUE_BY_ID } from '../../data/issues';
import { APPROACHES, DEBATE_ROUNDS } from '../../engine/debate';
import { issueEdge } from '../../engine/voterModel';
import { Avatar, Modal } from '../components/common';

export function DebateModal() {
  const game = useGame((s) => s.game)!;
  const { debatePick, debateFinish } = useGame();
  const live = game.liveDebate;
  if (!live) return null;
  const slot = game.debates.find((d) => d.id === live.slotId)!;
  const parts = live.participants.map((id) => game.candidates.find((c) => c.id === id)!);
  const done = live.round >= DEBATE_ROUNDS;
  const last = live.rounds[live.rounds.length - 1];
  const topic = !done ? live.topics[live.round] : null;
  const edge = topic && game.playerId ? issueEdge(game, game.playerId, topic) : 0;
  const totalAll = parts.reduce((a, c) => a + Math.max(1, live.totals[c.id]), 0);
  const player = game.candidates.find((c) => c.id === game.playerId);

  return (
    <Modal wide>
      <div className="debate-stage">
        <div className="debate-header">
          <div className="tiny display" style={{ letterSpacing: '0.2em', color: 'var(--accent)' }}>
            NA ŻYWO
          </div>
          <h2 className="display" style={{ fontSize: 30 }}>
            {slot.title}
          </h2>
          <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
            {Array.from({ length: DEBATE_ROUNDS }, (_, i) => (
              <span key={i} className={`round-pip${i < live.round ? ' done' : ''}${i === live.round ? ' now' : ''}`} />
            ))}
          </div>
        </div>
        <div className="debate-podiums">
          {parts.map((c) => {
            const share = Math.max(1, live.totals[c.id]) / totalAll;
            return (
              <div key={c.id} className={`podium${c.isPlayer ? ' me' : ''}`} style={{ borderColor: c.color }}>
                <Avatar name={c.name} color={c.color} size={64} />
                <div style={{ fontWeight: 800, marginTop: 6 }}>{c.name}</div>
                <div className="tiny muted">Przygotowanie {Math.round(c.debatePrep)}/100</div>
                <div className="meter">
                  <div style={{ width: `${live.round ? share * 100 : 100 / parts.length}%`, background: c.color }} />
                </div>
                {last && (
                  <div className="tiny" style={{ marginTop: 6 }}>
                    {APPROACH_META[last.picks[c.id]].icon} {APPROACH_META[last.picks[c.id]].label} · <b className="mono">{last.scores[c.id].toFixed(0)} pkt</b>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {last && (
          <div className="debate-commentary">
            {last.commentary.map((line, i) => (
              <div key={i} className="small">
                🎙 {line}
              </div>
            ))}
          </div>
        )}

        {!done && topic && (
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

        {done && (
          <div className="col" style={{ alignItems: 'center', gap: 12 }}>
            <div className="display" style={{ fontSize: 22 }}>
              Koniec debaty
            </div>
            <div className="small text-2">
              {player ? 'Błyskawiczny sondaż za chwilę pokaże, kto wygrał.' : ''} Łączna ocena:{' '}
              {parts.map((c) => (
                <b key={c.id} style={{ color: c.color, marginRight: 8 }}>
                  {c.name} {live.totals[c.id].toFixed(0)}
                </b>
              ))}
            </div>
            <button className="btn primary lg" onClick={debateFinish}>
              Zobacz wyniki sondażu po debacie →
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
