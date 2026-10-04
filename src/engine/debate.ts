// Debates: four rounds on salient topics. Each participant picks an approach; scores combine
// stats, preparation, issue advantage, style matchups and luck. A flash poll decides the winner.

import { APPROACH_META, DEBATE_QUESTIONS, ROUND_COMMENTARY } from '../data/debateText';
import { ISSUE_BY_ID, ISSUE_IDS } from '../data/issues';
import type { DebateApproach, DebateReport, DebateRound, DebateSlot, DebateStrategy, GameState, IssueId, LiveDebate } from './types';
import { PARTIES } from '../data/parties';
import { bi, fmt, L, quote, type LStr } from '../i18n';
import type { Rng } from './rng';
import { clamp, softmax } from './util';
import { computeSnapshot, issueEdge, nationalSalience } from './voterModel';
import { pushKeyEvent, pushNews } from './news';

export const DEBATE_ROUNDS = 4;
export const APPROACHES: DebateApproach[] = ['facts', 'attack', 'empathy', 'pivot'];

export const STRATEGY_META: Record<DebateStrategy, { label: LStr; icon: string; desc: LStr }> = {
  attack: { label: L('Atakować przeciwnika', 'Attack the opponent'), icon: '⚔️', desc: L('Premia do ataków, rywal traci na wizerunku. Przy niskiej wiarygodności grozi efekt bumerangu.', 'Bonus to attacks, the rival’s image suffers. With low credibility it may backfire.') },
  economy: { label: L('Skupić się na gospodarce', 'Focus on the economy'), icon: '📈', desc: L('Silniejszy w rundach o gospodarce, inflacji, pracy i podatkach; słabszy w pozostałych.', 'Stronger in rounds on the economy, inflation, jobs and taxes; weaker in others.') },
  security: { label: L('Skupić się na bezpieczeństwie', 'Focus on security'), icon: '🛡️', desc: L('Silniejszy w rundach o bezpieczeństwie, imigracji i polityce zagranicznej.', 'Stronger in rounds on crime, immigration and foreign policy.') },
  positive: { label: L('Pozytywny przekaz', 'Positive message'), icon: '☀️', desc: L('Premia do empatii, lepszy wizerunek po debacie, mniejsze straty przy porażce.', 'Bonus to empathy, a better image afterwards, smaller losses if you lose.') },
  counter: { label: L('Odpierać ataki', 'Counter attacks'), icon: '🥊', desc: L('Duża premia, gdy rywal atakuje; zyskujesz wizerunek, jeśli rywal wybrał strategię ataku.', 'Big bonus when the rival attacks; your image improves if the rival chose to attack.') },
};
export const STRATEGIES = Object.keys(STRATEGY_META) as DebateStrategy[];

const ECON_TOPICS: IssueId[] = ['economy', 'inflation', 'jobs', 'taxes'];
const SECURITY_TOPICS: IssueId[] = ['security', 'foreign', 'immigration'];

const OUTLETS = [
  { name: 'Capitol Wire', lean: 0 },
  { name: 'National Ledger', lean: 0 },
  { name: 'Liberty Daily', lean: 0.8 },
  { name: 'Progress Post', lean: -0.8 },
  { name: 'TrendTok News', lean: 0 },
];

export function aiStrategy(game: GameState, candId: string, rng: Rng): DebateStrategy {
  const c = game.candidates.find((x) => x.id === candId)!;
  const econEdge = ECON_TOPICS.reduce((a, t) => a + issueEdge(game, candId, t), 0) / ECON_TOPICS.length;
  const secEdge = SECURITY_TOPICS.reduce((a, t) => a + issueEdge(game, candId, t), 0) / SECURITY_TOPICS.length;
  const trailing = (game.history[game.history.length - 1]?.winProb[candId] ?? 0.5) < 0.3;
  if (trailing && rng.chance(0.6)) return 'attack';
  switch (c.style) {
    case 'aggressive':
      return rng.chance(0.7) ? 'attack' : 'counter';
    case 'grassroots':
      return rng.chance(0.6) ? 'positive' : econEdge > 0 ? 'economy' : 'counter';
    case 'media':
      return rng.pick(['attack', 'positive'] as DebateStrategy[]);
    default:
      if (Math.max(econEdge, secEdge) > 0.05) return econEdge >= secEdge ? 'economy' : 'security';
      return rng.pick(['positive', 'counter'] as DebateStrategy[]);
  }
}

export function scheduleDebates(totalDays: number): DebateSlot[] {
  const titles = [L('I debata prezydencka', 'First presidential debate'), L('II debata prezydencka', 'Second presidential debate'), L('III debata prezydencka', 'Third presidential debate')];
  return [0.46, 0.61, 0.76].map((f, i) => ({ id: `debate${i + 1}`, day: Math.round(totalDays * f), title: titles[i], done: false }));
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
  const strategies: Record<string, DebateStrategy> = {};
  for (const id of participants) if (id !== game.playerId) strategies[id] = aiStrategy(game, id, rng);
  return {
    slotId: slot.id,
    participants,
    topics,
    questions,
    round: 0,
    rounds: [],
    totals: Object.fromEntries(participants.map((id) => [id, 0])),
    strategies,
    stage: game.playerId && participants.includes(game.playerId) ? 'strategy' : 'rounds',
  };
}

export function aiApproach(game: GameState, candId: string, issue: IssueId, rng: Rng, strategy?: DebateStrategy): DebateApproach {
  const c = game.candidates.find((x) => x.id === candId)!;
  const edge = issueEdge(game, candId, issue);
  return rng.weighted(APPROACHES, (a) => {
    switch (a) {
      case 'facts':
        return 1 + c.stats.experience / 50 + edge;
      case 'attack':
        return 0.8 + c.stats.debate / 70 + (strategy === 'attack' ? 1.5 : 0);
      case 'empathy':
        return 0.8 + c.stats.charisma / 60;
      case 'pivot':
        return 0.6 + Math.max(0, -edge) * 3;
    }
  });
}

function baseScore(game: GameState, live: LiveDebate, candId: string, a: DebateApproach, issue: IssueId, picks: Record<string, DebateApproach>, rng: Rng): number {
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
  switch (live.strategies[candId]) {
    case 'economy':
      v += ECON_TOPICS.includes(issue) ? 8 : -2;
      break;
    case 'security':
      v += SECURITY_TOPICS.includes(issue) ? 8 : -2;
      break;
    case 'attack':
      v += a === 'attack' ? 6 : -1;
      break;
    case 'positive':
      v += a === 'empathy' ? 5 : a === 'facts' ? 2 : a === 'attack' ? -4 : 0;
      break;
    case 'counter':
      v += live.participants.some((o) => o !== candId && picks[o] === 'attack') ? 8 : -1;
      break;
  }
  return v + rng.normal(0, sd);
}

/** Resolve one round given everyone's approach. */
export function playRound(game: GameState, live: LiveDebate, picks: Record<string, DebateApproach>, rng: Rng): DebateRound {
  const issue = live.topics[live.round];
  const scores: Record<string, number> = {};
  for (const id of live.participants) scores[id] = baseScore(game, live, id, picks[id], issue, picks, rng);
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
    return fmt(rng.pick(bank), { name: c.name });
  });
  const round: DebateRound = { issue, question: live.questions[live.round], picks, scores, commentary };
  for (const id of live.participants) live.totals[id] += scores[id];
  live.rounds.push(round);
  live.round += 1;
  return round;
}

function grade(avg: number): string {
  if (avg >= 80) return 'A';
  if (avg >= 74) return 'A-';
  if (avg >= 69) return 'B+';
  if (avg >= 64) return 'B';
  if (avg >= 59) return 'C+';
  if (avg >= 54) return 'C';
  if (avg >= 47) return 'D';
  return 'F';
}

function headlines(game: GameState, live: LiveDebate, avg: Record<string, number>, rng: Rng): DebateReport['headlines'] {
  const ids = live.participants;
  const name = (id: string) => game.candidates.find((c) => c.id === id)!.name;
  return OUTLETS.map((o) => {
    // Partisan outlets tilt their verdict toward their side.
    const judged = ids
      .map((id) => ({ id, v: avg[id] + o.lean * PARTIES[game.candidates.find((c) => c.id === id)!.party].axis * 6 }))
      .sort((a, b) => b.v - a.v);
    const w = judged[0].id;
    const l = judged[1].id;
    const gap = judged[0].v - judged[1].v;
    const strat = live.strategies[w];
    const W = name(w);
    const Lo = name(l);
    let text: LStr;
    if (o.name === 'TrendTok News')
      text = rng.pick([L(`Internet ogłasza zwycięzcę: ${W} — #debata na szczycie trendów`, `The internet has spoken: ${W} wins — #debate is trending`), L(`Najczęściej udostępniany fragment debaty należy do ${W}`, `The most-shared clip of the night belongs to ${W}`)]);
    else if (gap > 9) text = rng.pick([L(`${W} dominuje w debacie, ${Lo} w defensywie`, `${W} dominates the debate, ${Lo} on the defensive`), L(`Nokaut: ${W} bezapelacyjnie wygrywa starcie`, `Knockout: ${W} wins decisively`)]);
    else if (gap < 3) text = L(`Wyrównana debata, minimalna przewaga ${W}`, `A close debate with a slight edge to ${W}`);
    else if (strat === 'attack') text = L(`Ostre starcie: ${W} punktuje ${Lo}`, `Fiery clash: ${W} lands blows on ${Lo}`);
    else if (strat === 'economy') text = L(`${W} przekonuje w sprawach gospodarki`, `${W} wins the argument on the economy`);
    else if (strat === 'security') text = L(`${W} pewniej w tematach bezpieczeństwa`, `${W} more confident on security`);
    else if (strat === 'positive') text = L(`Optymistyczny przekaz ${W} trafia do widzów`, `${W}’s upbeat message resonates with viewers`);
    else text = L(`${W} skutecznie odpiera ataki rywala`, `${W} effectively parries the rival’s attacks`);
    return { outlet: o.name, text, lean: o.lean };
  });
}

/** Apply the debate outcome to the race and build the post-debate report. */
export function finishDebate(game: GameState, live: LiveDebate, rng: Rng) {
  const slot = game.debates.find((d) => d.id === live.slotId)!;
  const ids = live.participants;
  const before = computeSnapshot(game).national;
  const momBefore = Object.fromEntries(game.candidates.map((c) => [c.id, c.momentum]));
  const avg: Record<string, number> = {};
  for (const id of ids) avg[id] = live.totals[id] / Math.max(1, live.rounds.length);
  // Average per-round score difference of ~20 points ≈ a 69/31 flash poll.
  const shares = softmax(ids.map((id) => avg[id] / 25));
  const flashPoll: Record<string, number> = {};
  ids.forEach((id, i) => (flashPoll[id] = Math.round(shares[i] * 100)));
  const winner = ids[shares.indexOf(Math.max(...shares))];
  const n = ids.length;
  for (const id of ids) {
    const c = game.candidates.find((x) => x.id === id)!;
    let delta = flashPoll[id] / 100 - 1 / n;
    const strat = live.strategies[id];
    if (strat === 'positive') {
      if (delta < 0) delta *= 0.5;
      c.favorability = clamp(c.favorability + 1.5, -50, 50);
    }
    if (strat === 'attack') {
      for (const o of ids) if (o !== id) game.candidates.find((x) => x.id === o)!.favorability -= 1.5;
      if (c.stats.integrity < 50) c.favorability -= 1;
    }
    if (strat === 'counter' && ids.some((o) => o !== id && live.strategies[o] === 'attack')) c.favorability = clamp(c.favorability + 1, -50, 50);
    c.momentum += delta * 0.8;
    c.favorability = clamp(c.favorability + delta * 10, -50, 50);
    c.enthusiasm = clamp(c.enthusiasm + delta * 8, 0, 100);
    c.social.buzz = clamp(c.social.buzz + delta * 0.8, -1, 1);
    c.debatePrep = 0;
  }
  // Excluded candidates lose visibility.
  for (const c of game.candidates) if (!ids.includes(c.id)) c.momentum -= 0.05;
  game.candidates.find((c) => c.id === winner)!.totals.debatesWon += 1;
  for (const topic of live.topics) game.salienceShock[topic] += 0.08;
  game.interest = Math.min(100, game.interest + 3);
  const after = computeSnapshot(game).national;
  const report: DebateReport = {
    grades: Object.fromEntries(ids.map((id) => [id, grade(avg[id])])),
    scores: avg,
    strategies: { ...live.strategies },
    headlines: headlines(game, live, avg, rng),
    pollShift: Object.fromEntries(game.candidates.map((c) => [c.id, (after[c.id] - before[c.id]) * 100])),
    momentumShift: Object.fromEntries(game.candidates.map((c) => [c.id, c.momentum - momBefore[c.id]])),
  };
  slot.done = true;
  slot.participants = ids;
  slot.winner = winner;
  slot.flashPoll = flashPoll;
  slot.report = report;
  live.stage = 'report';
  const wName = game.candidates.find((c) => c.id === winner)!.name;
  const pollTxt = ids.map((id) => `${game.candidates.find((c) => c.id === id)!.name} ${flashPoll[id]}%`).join(' · ');
  const h0 = report.headlines[0];
  pushNews(game, L(`${slot.title.pl}: wygrywa ${wName} według błyskawicznego sondażu (${pollTxt})`, `${slot.title.en}: ${wName} wins according to the flash poll (${pollTxt})`), {
    tone: 'breaking',
    candId: winner,
    category: 'debate',
    body: bi((l) => `${l === 'pl' ? 'Tematy' : 'Topics'}: ${live.topics.map((t) => ISSUE_BY_ID[t].label[l]).join(', ')}. ${h0.outlet}: ${quote(h0.text[l], l)}.`),
  });
  pushKeyEvent(game, { text: L(`${slot.title.pl} — zwycięstwo ${wName} (${flashPoll[winner]}%)`, `${slot.title.en} — won by ${wName} (${flashPoll[winner]}%)`), candId: winner, impact: (flashPoll[winner] - 100 / n) / 5 });
  const excluded = game.candidates.filter((c) => !ids.includes(c.id));
  const exNames = excluded.map((c) => c.name).join(', ');
  if (excluded.length) pushNews(game, L(`${exNames} poza debatą — próg 15% nieosiągnięty`, `${exNames} left out of the debate — below the 15% threshold`), { tone: 'bad', category: 'debate' });
}

/** Debates without the player are simulated instantly. */
export function autoDebate(game: GameState, slot: DebateSlot, rng: Rng) {
  const live = startDebate(game, slot, rng);
  while (live.round < DEBATE_ROUNDS) {
    const issue = live.topics[live.round];
    const picks: Record<string, DebateApproach> = {};
    for (const id of live.participants) picks[id] = aiApproach(game, id, issue, rng, live.strategies[id]);
    playRound(game, live, picks, rng);
  }
  finishDebate(game, live, rng);
}
