import type { LStr } from '../i18n';

// Core data model. All game state is plain, JSON-serialisable data so it can be
// cloned each tick, saved to localStorage and inspected in tests.

export type IssueId =
  | 'economy'
  | 'inflation'
  | 'jobs'
  | 'immigration'
  | 'taxes'
  | 'healthcare'
  | 'security'
  | 'foreign'
  | 'climate'
  | 'social'
  | 'education';

/** Position on an issue: -100 = progressive/left, +100 = conservative/right. */
export type Positions = Record<IssueId, number>;

export type PartyId = 'DEM' | 'REP' | 'LIB' | 'GRN' | 'IND';

export type ProfileId =
  | 'governor'
  | 'senator'
  | 'business'
  | 'general'
  | 'activist'
  | 'celebrity'
  | 'mayor';

export type Region = 'northeast' | 'south' | 'midwest' | 'west' | 'mountain';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface CandidateStats {
  charisma: number;
  debate: number;
  experience: number;
  /** Credibility / integrity. */
  integrity: number;
  fundraising: number;
  discipline: number;
  /** Organisational skill: ground game, rallies, staff efficiency. */
  campaign: number;
  /** Media & online skill: interviews, social media, virality. */
  media: number;
  /** Grassroots support: volunteers, small donors, base enthusiasm. */
  grassroots: number;
  /** Hidden: how likely and how damaging scandals are. */
  scandalRisk: number;
}

export type TraitId = 'orator' | 'debater' | 'machine' | 'moneyMagnet' | 'online' | 'teflon' | 'scandalProne' | 'grassroots' | 'gaffeProne' | 'veteran' | 'outsider';

/** Behavioural archetype used by the AI campaign manager. */
export type AiStyle = 'aggressive' | 'establishment' | 'grassroots' | 'media' | 'balanced';

export type SocialStrategy = 'positive' | 'attack' | 'policy' | 'viral';

export interface SocialState {
  followers: number; // millions
  engagement: number; // %
  buzz: number; // -1..1, decays
  strategy: SocialStrategy;
}

export type FundSource = 'small' | 'major' | 'pac' | 'events' | 'party';
export type SpendCategory = 'tv' | 'digital' | 'ground' | 'travel' | 'events' | 'staff';

export interface Ledger {
  raised: Record<FundSource, number>;
  spent: Record<SpendCategory, number>;
}

export type ScheduleKind =
  | 'rally'
  | 'townhall'
  | 'fundraiser'
  | 'speech'
  | 'interview'
  | 'debatePrep'
  | 'socialBlitz'
  | 'rest';

export interface ScheduledAction {
  id: string;
  kind: ScheduleKind;
  state?: string;
  issue?: IssueId;
}

export interface Candidate {
  id: string;
  name: string;
  party: PartyId;
  color: string;
  profile: ProfileId;
  homeState: string;
  isPlayer: boolean;
  /** Player only: staff fills empty schedule days automatically. */
  autopilot?: boolean;
  positions: Positions;
  platform: Partial<Record<IssueId, string>>;
  manifesto: string;
  slogan: string;
  stats: CandidateStats;
  traits: TraitId[];
  style: AiStyle;
  social: SocialState;
  ledger: Ledger;
  /** State where the candidate currently is (travel costs). */
  location: string;
  // dynamic campaign values
  funds: number; // $M
  stamina: number; // 0..100
  momentum: number; // ~ -1..1, decays toward 0
  favorability: number; // net favorability, -50..50
  enthusiasm: number; // 0..100, base turnout of supporters
  debatePrep: number; // 0..100
  schedule: ScheduledAction[];
  totals: { raised: number; spent: number; rallies: number; adsRun: number; debatesWon: number; scandals: number };
}

export interface CandidateSetup {
  name: string;
  party: PartyId;
  profile: ProfileId;
  homeState: string;
  positions: Positions;
  platform: Partial<Record<IssueId, string>>;
  manifesto: string;
  slogan: string;
  color?: string;
  /** Pre-rolled individual stats (shown in setup); rolled from the profile if absent. */
  stats?: CandidateStats;
}

export interface GameSettings {
  totalDays: number;
  difficulty: Difficulty;
  incumbentParty: PartyId | null;
  playerIndex: number | null; // null = spectator mode
  seed: number;
}

export interface StateRuntime {
  presence: Record<string, number>; // rally / visit stock, decays
  ads: Record<string, number>; // positive ad stock, decays
  attacks: Record<string, number>; // attack-ad stock *targeting* candidate id, decays
  offices: Record<string, number>; // field offices level 0..3 (permanent)
  eventMod: Record<string, number>; // local event effects, decays
  digital: Record<string, number>; // online ad stock, decays
  canvass: Record<string, number>; // door-to-door program stock, decays slowly
  banked: Record<string, number>; // early votes already cast (millions)
}

export type AdKind = 'positive' | 'attack' | 'issue';
export type AdChannel = 'tv' | 'digital' | 'canvass';

export interface AdCampaign {
  id: string;
  candId: string;
  scope: string; // state code or 'national'
  channel: AdChannel;
  kind: AdKind;
  /** Stock added per day (already includes diminishing returns on spend). */
  intensity: number;
  budget: number;
  issue?: IssueId;
  targetId?: string;
  daysLeft: number;
  dailyCost: number;
}

export interface Economy {
  gdp: number; // annualised growth %
  inflation: number; // %
  unemployment: number; // %
  gas: number; // $/gal
  rate: number; // Fed funds rate %
  stocks: number; // stock index level
  confidence: number; // 0..100 derived
}

export interface Poll {
  id: string;
  day: number;
  pollster: string;
  scope: string; // 'national' or state code
  sample: number;
  moe: number;
  results: Record<string, number>; // percent, sums with undecided to 100
  undecided: number;
}

export type NewsTone = 'good' | 'bad' | 'neutral' | 'breaking';

export interface NewsItem {
  id: string;
  day: number;
  headline: LStr;
  body?: LStr;
  tone: NewsTone;
  candId?: string;
  category: string;
  severity: Severity;
}

export type Severity = 'minor' | 'moderate' | 'major';

export interface KeyEvent {
  day: number;
  text: LStr;
  candId?: string;
  impact: number; // signed magnitude for the candidate
}

export interface EventContext {
  candId?: string;
  otherId?: string;
  state?: string;
  issue?: IssueId;
}

export interface ActiveEvent {
  templateId: string;
  ctx: EventContext;
  day: number;
}

export type DebateApproach = 'facts' | 'attack' | 'empathy' | 'pivot';

export interface DebateRound {
  issue: IssueId;
  question: LStr;
  picks: Record<string, DebateApproach>;
  scores: Record<string, number>;
  commentary: LStr[];
}

export interface DebateSlot {
  id: string;
  day: number;
  title: LStr;
  done: boolean;
  participants?: string[];
  winner?: string;
  flashPoll?: Record<string, number>;
  report?: DebateReport;
}

export type DebateStrategy = 'attack' | 'economy' | 'security' | 'positive' | 'counter';

export interface DebateReport {
  grades: Record<string, string>;
  scores: Record<string, number>;
  strategies: Record<string, DebateStrategy>;
  headlines: { outlet: string; text: LStr; lean: number }[];
  pollShift: Record<string, number>; // pp change in national estimate
  momentumShift: Record<string, number>;
}

export interface LiveDebate {
  slotId: string;
  participants: string[];
  topics: IssueId[];
  questions: LStr[];
  round: number;
  rounds: DebateRound[];
  totals: Record<string, number>;
  strategies: Record<string, DebateStrategy>;
  stage: 'strategy' | 'rounds' | 'report';
}

export interface DaySnapshot {
  day: number;
  national: Record<string, number>; // estimated decided share %, incl. undecided separately
  undecided: number;
  ev: Record<string, number>; // projected EV (by leader in each state)
  winProb: Record<string, number>;
  stateEst: Record<string, number[]>; // per state: estimated decided share per candidate index
  funds: Record<string, number>;
  momentum: Record<string, number>;
  buzz: Record<string, number>;
  turnout: number; // projected national turnout
}

export type GroupId = 'young' | 'middle' | 'senior' | 'city' | 'suburb' | 'rural' | 'college' | 'noncollege' | 'lowInc' | 'midInc' | 'highInc' | 'independent';

export interface GroupResult {
  shares: Record<string, number>;
  turnout: number; // fraction of the group that votes
  size: number; // share of the electorate (adults)
}

export interface Baseline {
  groups: Record<GroupId, GroupResult>;
  stateShares: Record<string, Record<string, number>>;
  turnout: number;
}

export interface EconPoint extends Economy {
  day: number;
}

export interface Forecast {
  winProb: Record<string, number>;
  evMean: Record<string, number>;
  noMajority: number;
  stateWinProb: Record<string, Record<string, number>>;
}

export interface StateResult {
  code: string;
  votes: Record<string, number>; // raw votes (millions)
  shares: Record<string, number>; // 0..1
  turnout: number; // fraction of VEP
  totalVotes: number;
  winner: string;
  ev: Record<string, number>; // EV awarded (handles ME/NE splits)
  earlyShare: number; // fraction of votes cast early
  groups: Record<GroupId, GroupResult>;
}

export interface ElectionResult {
  states: Record<string, StateResult>;
  popular: Record<string, number>; // votes (millions)
  popularShare: Record<string, number>;
  ev: Record<string, number>;
  winner: string;
  contingent: boolean; // decided by the House (no 270)
  turnout: number;
  totalVotes: number;
  groups: Record<GroupId, GroupResult>;
  analysis: Analysis;
}

export interface Analysis {
  headline: LStr;
  reasons: LStr[];
  caveats: LStr[];
  factors: { label: LStr; value: number }[]; // winner minus runner-up utility contributions
  tippingPoint?: string;
  summary: LStr;
  swingStates: string[];
}

export type Phase = 'campaign' | 'election' | 'finished';

export interface GameState {
  version: number;
  settings: GameSettings;
  rng: number;
  phase: Phase;
  day: number; // 0 .. totalDays (election day)
  startDate: string; // ISO date of day 0
  candidates: Candidate[];
  playerId: string | null;
  economy: Economy;
  econHistory: EconPoint[];
  /** Presidential (administration) approval %, drives the incumbent-party effect. */
  approval: number;
  /** Public interest in the election 0..100 (turnout). */
  interest: number;
  baseline: Baseline | null;
  conventions: { candId: string; day: number; done: boolean }[];
  baseSalience: Record<IssueId, number>;
  salienceShock: Record<IssueId, number>;
  /** Per-state campaign runtime. The pseudo-key '__national' holds nationwide ad stock. */
  states: Record<string, StateRuntime>;
  ads: AdCampaign[];
  polls: Poll[];
  news: NewsItem[];
  keyEvents: KeyEvent[];
  history: DaySnapshot[];
  forecast: Forecast | null;
  debates: DebateSlot[];
  liveDebate: LiveDebate | null;
  pendingEvent: ActiveEvent | null;
  pollingError: Record<string, Record<string, number>>; // state -> cand -> utility error
  cooldowns: Record<string, number>; // event template id -> day available again
  idCounter: number;
  result: ElectionResult | null;
}
