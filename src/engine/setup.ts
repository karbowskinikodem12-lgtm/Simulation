// Builds a fresh GameState from the player's election setup.

import { STATES } from '../data/states';
import { ISSUES, ISSUE_IDS } from '../data/issues';
import { PARTIES } from '../data/parties';
import { PROFILES } from '../data/profiles';
import { DIFFICULTY_MULT, ELECTION_DATE, TUNING } from './config';
import type { Candidate, CandidateSetup, GameSettings, GameState, IssueId, StateRuntime } from './types';
import { createRng } from './rng';
import { initialEconomy } from './economy';
import { scheduleDebates } from './debate';
import { pushNews } from './news';
import { refreshDerived } from './simulation';
import { clamp } from './util';

export const GAME_VERSION = 1;

const ALT_COLORS = ['#06b6d4', '#f97316', '#ec4899', '#84cc16', '#a855f7', '#eab308'];

function emptyRuntime(): StateRuntime {
  return { presence: {}, ads: {}, attacks: {}, offices: {}, eventMod: {}, banked: {} };
}

export function campaignStartDate(totalDays: number): string {
  const d = new Date(`${ELECTION_DATE}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - totalDays);
  return d.toISOString().slice(0, 10);
}

export function dateForDay(game: Pick<GameState, 'startDate'>, day: number): Date {
  const d = new Date(`${game.startDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + day);
  return d;
}

export function createGame(setups: CandidateSetup[], settings: GameSettings): GameState {
  const rng = createRng(settings.seed);
  const usedColors = new Set<string>();
  const mult = DIFFICULTY_MULT[settings.difficulty];

  const candidates: Candidate[] = setups.map((s, i) => {
    const party = PARTIES[s.party];
    const profile = PROFILES[s.profile];
    let color = s.color ?? party.color;
    if (usedColors.has(color)) color = ALT_COLORS.find((c) => !usedColors.has(c))!;
    usedColors.add(color);
    const isPlayer = settings.playerIndex === i;
    const funds = (party.startFunds + profile.fundsBonus) * (isPlayer ? mult.playerFunds : mult.ai);
    return {
      id: `c${i}`,
      name: s.name.trim() || `Kandydat ${i + 1}`,
      party: s.party,
      color,
      profile: s.profile,
      homeState: s.homeState,
      isPlayer,
      autopilot: isPlayer ? true : undefined,
      positions: { ...s.positions },
      platform: { ...s.platform },
      manifesto: s.manifesto,
      slogan: s.slogan,
      stats: { ...profile.stats },
      funds: Math.max(3, funds),
      stamina: 100,
      momentum: 0,
      favorability: Math.round(rng.normal(0, 3)),
      enthusiasm: clamp((party.brandPenalty > 0 ? 48 : 56) + (s.profile === 'activist' ? 6 : 0) + (s.profile === 'celebrity' ? 4 : 0), 0, 100),
      debatePrep: 0,
      schedule: [],
      totals: { raised: 0, spent: 0, rallies: 0, adsRun: 0, debatesWon: 0, scandals: 0 },
    };
  });

  const states: Record<string, StateRuntime> = { __national: emptyRuntime() };
  for (const s of STATES) states[s.code] = emptyRuntime();

  // Systemic polling error: hidden from the player, revealed on election night.
  const pollingError: Record<string, Record<string, number>> = {};
  const nat = Object.fromEntries(candidates.map((c) => [c.id, rng.normal(0, TUNING.pollingErrorNational)]));
  const regional: Record<string, Record<string, number>> = {};
  for (const r of ['northeast', 'south', 'midwest', 'west', 'mountain']) regional[r] = Object.fromEntries(candidates.map((c) => [c.id, rng.normal(0, TUNING.pollingErrorRegional)]));
  for (const s of STATES) {
    pollingError[s.code] = Object.fromEntries(candidates.map((c) => [c.id, nat[c.id] + regional[s.region][c.id] + rng.normal(0, TUNING.pollingErrorState)]));
  }

  const baseSalience = Object.fromEntries(ISSUES.map((i) => [i.id, i.baseSalience])) as Record<IssueId, number>;
  const salienceShock = Object.fromEntries(ISSUE_IDS.map((id) => [id, 0])) as Record<IssueId, number>;
  const economy = initialEconomy(rng);

  const game: GameState = {
    version: GAME_VERSION,
    settings,
    rng: rng.state(),
    phase: 'campaign',
    day: 0,
    startDate: campaignStartDate(settings.totalDays),
    candidates,
    playerId: settings.playerIndex === null ? null : `c${settings.playerIndex}`,
    economy,
    econHistory: [{ day: 0, ...economy }],
    baseSalience,
    salienceShock,
    states,
    ads: [],
    polls: [],
    news: [],
    keyEvents: [],
    history: [],
    forecast: null,
    debates: scheduleDebates(settings.totalDays),
    liveDebate: null,
    pendingEvent: null,
    pollingError,
    cooldowns: {},
    idCounter: 0,
    result: null,
  };

  pushNews(game, `Rusza kampania prezydencka! Do wyborów zostało ${settings.totalDays} dni`, {
    tone: 'breaking',
    category: 'campaign',
    body: candidates.map((c) => `${c.name} (${PARTIES[c.party].short})`).join(' vs '),
  });
  pushNews(game, `Gospodarka na starcie kampanii: PKB ${economy.gdp.toFixed(1)}%, inflacja ${economy.inflation.toFixed(1)}%, bezrobocie ${economy.unemployment.toFixed(1)}%`, {
    category: 'economy',
  });
  refreshDerived(game, { initialPolls: true });
  return game;
}
