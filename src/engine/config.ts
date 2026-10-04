// Central balance knobs. Tweaking numbers here should be the first stop when tuning gameplay.

export const TUNING = {
  // --- voter model ---
  partisanWeight: 0.5, // multiplier on atanh(lean) partisanship
  issueWeight: 0.55, // weight of policy distance (per 100 points of distance)
  idealScale: 95, // how many position points one unit of state lean moves the median voter
  favorabilityWeight: 0.008, // utility per point of net favorability
  momentumWeight: 0.32,
  homeStateBonus: 0.22,
  homeRegionBonus: 0.04,
  economyWeight: 0.3, // incumbent-party reward/punishment for the economy
  qualityWeight: 0.004, // utility per stat point over 50 (charisma + experience)
  effortWeight: 0.075, // utility per log-unit of campaign effort in a state
  attackWeight: 0.06,
  nationalAdSpill: 0.22,

  // --- undecided voters ---
  undecidedStart: 0.11,
  undecidedEnd: 0.025,

  // --- decay per day ---
  momentumDecay: 0.955,
  favorabilityReversion: 0.993,
  presenceDecay: 0.94,
  adDecay: 0.88,
  eventModDecay: 0.96,
  salienceShockDecay: 0.94,

  // --- campaign actions ---
  rallyPresence: 1.0,
  townhallPresence: 0.65,
  officePresence: 0.55,
  adStrength: 0.42, // stock added per day of an ad campaign
  rallyCost: 0.3,
  townhallCost: 0.12,
  nationalAdDailyCost: 1.3,
  stateAdBaseDailyCost: 0.025,
  stateAdPerVepDailyCost: 0.02,
  officeBaseCost: 0.35,
  officePerVepCost: 0.05,
  maxOffices: 3,
  maxScheduleLength: 7,

  // --- polling / forecast ---
  pollingErrorNational: 0.05, // utility-scale sd of systemic polling miss
  pollingErrorRegional: 0.035,
  pollingErrorState: 0.03,
  forecastSims: 400,

  // --- early voting ---
  earlyVotingDays: 28,

  // --- events ---
  dailyEventChance: 0.24,
} as const;

export const DIFFICULTY_MULT = {
  easy: { ai: 0.8, playerFunds: 1.25 },
  normal: { ai: 1, playerFunds: 1 },
  hard: { ai: 1.2, playerFunds: 0.85 },
} as const;

/** Election Day 2028 (first Tuesday after the first Monday in November). */
export const ELECTION_DATE = '2028-11-07';
