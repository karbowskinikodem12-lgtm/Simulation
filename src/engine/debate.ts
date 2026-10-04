// Debates: four rounds on salient topics. Each participant picks an approach; scores combine
// stats, preparation, issue advantage, style matchups and luck. A flash poll decides the winner.

import { APPROACH_META, DEBATE_QUESTIONS, ROUND_COMMENTARY } from '../data/debateText';
import { ISSUE_BY_ID, ISSUE_IDS } from '../data/issues';
import type { DebateApproach, DebateRound, DebateSlot, GameState, IssueId, LiveDebate } from './types';
import type { Rng } from './rng';
import { clamp, softmax } from './util';
import { computeSnapshot, issueEdge, nationalSalience } from './voterModel';
import { pushKeyEvent, pushNews } from './news';

export const DEBATE_ROUNDS = 4;
export const APPROACHES: DebateApproach[] = ['facts', 'attack', 'empathy', 'pivot'];

export function scheduleDebates(totalDays: number): DebateSlot[] {
  const titles = ['I debata prezydencka', 'II debata prezydencka', 'III debata prezydencka'];
  return [0.36, 0.57, 0.77].map((f, i) => ({ id: `debate${i + 1}`, day: Math.round(totalDays * f), title: titles[i], done: false }));
}

/** Debate commission rule: 15% in national polling, at least two participants. */
export function debateParticipants(game: GameState): string[] {
  const snap = computeSnapshot(game);
  const sorted = [...game.candidates].sort((a, b) => snap.national[b.id] - snap.national[a.id]);
  const qualified = sorted.filter((c) => snap.national[c.id] * (1 - snap.undecided) >= 0.15).map((c) => c.id);
  if (qualified.length >= 2) return qualified;
  return sorted.slice(0, 2).map((c) => c.id);
}

export function startDebate(game: GameState, slot: DebateSlot, rng: Rng): LiveDebate {
  const sal = nationalSalience(game);
  const pool = [...ISSUE_IDS];
  const topics: IssueId[] = [];
  while (topics.length < DEBATE_ROUNDS) {
    const pick = rng.weighted(pool, (id) => sal[id] + 0.02);
    topics.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }
  const participants = debateParticipants(game);
  const questions = topics.map((t) => rng.pick(DEBATE_QUESTIONS[t]));
  return { slotId: slot.id, participants, topics, questions, round: 0, rounds: [], totals: Object.fromEntries(participants.map((id) => [id, 0])) };
}

export function aiApproach(game: GameState, candId: string, issue: IssueId, rng: Rng): DebateApproach {
  const c = game.candidates.find((x) => x.id === candId)!;
  const edge = issueEdge(game, candId, issue);
  return rng.weighted(APPROACHES, (a) => {
    switch (a) {
      case 'facts':
        return 1 + c.stats.experience / 50 + edge;
      case 'attack':
        return 0.8 + c.stats.debate / 70;
      case 'empathy':
        return 0.8 + c.stats.charisma / 60;
      case 'pivot':
        return 0.6 + Math.max(0, -edge) * 3;
    }
  });
}

function baseScore(game: GameState, candId: string, a: DebateApproach, issue: IssueId, rng: Rng): number {
  const c = game.candidates.find((x) => x.id === candId)!;
  const s = c.stats;
  const edge = issueEdge(game, candId, issue);
  let v = 0;
  let sd = 10;
  switch (a) {
    case 'facts':
      v = s.experience * 0.5 + s.debate * 0.3 + edge * 18;
      sd = 7;
      break;
    case 'attack':
      v = s.debate * 0.45 + s.charisma * 0.35 + 4;
      sd = 17;
      break;
    case 'empathy':
      v = s.charisma * 0.5 + s.integrity * 0.3 + (['healthcare', 'education', 'social', 'jobs'].includes(issue) ? 6 : 0);
      sd = 10;
      break;
    case 'pivot':
      v = s.debate * 0.6 + (edge < 0 ? -edge * 22 : -edge * 12) + 6;
      sd = 12;
      break;
  }
  v += c.debatePrep * 0.14 + (c.stamina - 50) * 0.05;
  return v + rng.normal(0, sd);
}

/** Resolve one round given everyone's approach. */
export function playRound(game: GameState, live: LiveDebate, picks: Record<string, DebateApproach>, rng: Rng): DebateRound {
  const issue = live.topics[live.round];
  const scores: Record<string, number> = {};
  for (const id of live.participants) scores[id] = baseScore(game, id, picks[id], issue, rng);
  // Style matchups: each approach counters exactly one other.
  for (const id of live.participants) {
    for (const other of live.participants) {
      if (other === id) continue;
      if (APPROACH_META[picks[id]].beats === picks[other]) scores[id] += 9;
    }
  }
  const mean = live.participants.reduce((a, id) => a + scores[id], 0) / live.participants.length;
  const commentary = live.participants.map((id) => {
    const c = game.candidates.find((x) => x.id === id)!;
    const bank = ROUND_COMMENTARY[picks[id]][scores[id] >= mean ? 'good' : 'bad'];
    return rng.pick(bank).replaceAll('{name}', c.name);
  });
  const round: DebateRound = { issue, question: live.questions[live.round], picks, scores, commentary };
  for (const id of live.participants) live.totals[id] += scores[id];
  live.rounds.push(round);
  live.round += 1;
  return round;
}

/** Apply the debate outcome to the race. */
export function finishDebate(game: GameState, live: LiveDebate) {
  const slot = game.debates.find((d) => d.id === live.slotId)!;
  const ids = live.participants;
  // Average per-round score difference of ~20 points ≈ a 69/31 flash poll.
  const shares = softmax(ids.map((id) => live.totals[id] / Math.max(1, live.rounds.length) / 25));
  const flashPoll: Record<string, number> = {};
  ids.forEach((id, i) => (flashPoll[id] = Math.round(shares[i] * 100)));
  const winner = ids[shares.indexOf(Math.max(...shares))];
  const n = ids.length;
  for (const id of ids) {
    const c = game.candidates.find((x) => x.id === id)!;
    const delta = flashPoll[id] / 100 - 1 / n;
    c.momentum += delta * 0.8;
    c.favorability = clamp(c.favorability + delta * 10, -50, 50);
    c.enthusiasm = clamp(c.enthusiasm + delta * 8, 0, 100);
    c.debatePrep = 0;
  }
  // Excluded candidates lose visibility.
  for (const c of game.candidates) if (!ids.includes(c.id)) c.momentum -= 0.05;
  game.candidates.find((c) => c.id === winner)!.totals.debatesWon += 1;
  for (const topic of live.topics) game.salienceShock[topic] += 0.08;
  slot.done = true;
  slot.participants = ids;
  slot.winner = winner;
  slot.flashPoll = flashPoll;
  const wName = game.candidates.find((c) => c.id === winner)!.name;
  const pollTxt = ids.map((id) => `${game.candidates.find((c) => c.id === id)!.name} ${flashPoll[id]}%`).join(' · ');
  pushNews(game, `${slot.title}: wygrywa ${wName} według błyskawicznego sondażu (${pollTxt})`, {
    tone: 'breaking',
    candId: winner,
    category: 'debate',
    body: `Tematy: ${live.topics.map((t) => ISSUE_BY_ID[t].label).join(', ')}.`,
  });
  pushKeyEvent(game, { text: `${slot.title} — zwycięstwo ${wName} (${flashPoll[winner]}%)`, candId: winner, impact: (flashPoll[winner] - 100 / n) / 5 });
  const excluded = game.candidates.filter((c) => !ids.includes(c.id));
  if (excluded.length) pushNews(game, `${excluded.map((c) => c.name).join(', ')} poza debatą — próg 15% nieosiągnięty`, { tone: 'bad', category: 'debate' });
}

/** Debates without the player are simulated instantly. */
export function autoDebate(game: GameState, slot: DebateSlot, rng: Rng) {
  const live = startDebate(game, slot, rng);
  while (live.round < DEBATE_ROUNDS) {
    const issue = live.topics[live.round];
    const picks: Record<string, DebateApproach> = {};
    for (const id of live.participants) picks[id] = aiApproach(game, id, issue, rng);
    playRound(game, live, picks, rng);
  }
  finishDebate(game, live);
}
