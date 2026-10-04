// Builds a fresh GameState from the player's election setup.

import { STATES } from '../data/states';
import { ISSUES, ISSUE_IDS } from '../data/issues';
import { PARTIES } from '../data/parties';
import { PROFILES, deriveTraits } from '../data/profiles';
import { DIFFICULTY_MULT, ELECTION_DATE, TUNING } from './config';
import type { Candidate, CandidateSetup, CandidateStats, GameSettings, GameState, IssueId, ProfileId, StateRuntime } from './types';
import { createRng } from './rng';
import { initialEconomy } from './economy';
import { scheduleDebates } from './debate';
import { pushNews } from './news';
import { bi, L } from '../i18n';
import { refreshDerived } from './simulation';
import { computeSnapshot, economyIndex } from './voterModel';
import { clamp } from './util';
import { emptyLedger } from './actions';
import { initialSocial } from './social';
import { scheduleConventions } from './timeline';

export const GAME_VERSION = 3;

const ALT_COLORS = ['#06b6d4', '#f97316', '#ec4899', '#84cc16', '#a855f7', '#eab308'];

function emptyRuntime(): StateRuntime {
  return { presence: {}, ads: {}, attacks: {}, offices: {}, eventMod: {}, digital: {}, canvass: {}, banked: {} };
}

/** Profile stats with individual variation, so two governors are never identical. */
export function rollStats(profile: ProfileId, seed: number): CandidateStats {
  const rng = createRng(seed);
  const base = PROFILES[profile].stats;
  const out = {} as CandidateStats;
  for (const k of Object.keys(base) as (keyof CandidateStats)[]) out[k] = Math.round(clamp(base[k] + rng.normal(0, 7), 10, 97));
  return out;
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
    const stats = s.stats ? { ...s.stats } : rollStats(s.profile, settings.seed + i * 101);
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
      stats,
      traits: deriveTraits(stats),
      style: profile.style,
      social: initialSocial({ profile: s.profile, stats, party: s.party }, rng),
      ledger: emptyLedger(),
      location: s.homeState,
      funds: Math.max(3, funds),
      stamina: 100,
      momentum: 0,
      favorability: Math.round(rng.normal(0, 3)),
      enthusiasm: clamp((party.brandPenalty > 0 ? 48 : 54) + (stats.grassroots - 55) / 6, 0, 100),
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
    approval: clamp(44 + economyIndex(economy) * 12 + rng.normal(0, 3), 30, 62),
    interest: 45,
    baseline: null,
    conventions: [],
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

  pushNews(game, L(`Rusza kampania prezydencka! Do wyborów zostało ${settings.totalDays} dni`, `The presidential campaign begins! ${settings.totalDays} days until the election`), {
    tone: 'breaking',
    category: 'campaign',
    body: bi((l) => candidates.map((c) => `${c.name} (${PARTIES[c.party].short[l]})`).join(' vs ')),
  });
  const [g, inf, un] = [economy.gdp.toFixed(1), economy.inflation.toFixed(1), economy.unemployment.toFixed(1)];
  pushNews(game, L(`Gospodarka na starcie kampanii: PKB ${g}%, inflacja ${inf}%, bezrobocie ${un}%`, `The economy at the start of the campaign: GDP ${g}%, inflation ${inf}%, unemployment ${un}%`), {
    category: 'economy',
  });
  game.conventions = scheduleConventions(game);
  refreshDerived(game, { initialPolls: true });
  const snap = computeSnapshot(game);
  game.baseline = {
    groups: snap.groups,
    stateShares: Object.fromEntries(STATES.map((st) => [st.code, { ...snap.states[st.code].shares }])),
    turnout: snap.turnout,
  };
  return game;
}
