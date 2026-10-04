import { generatePlatform } from '../src/engine/platform';
import { createGame } from '../src/engine/setup';
import type { CandidateSetup, GameSettings, PartyId, ProfileId } from '../src/engine/types';

export function makeSetup(name: string, party: PartyId, profile: ProfileId, homeState: string, seed: number, style: 'moderate' | 'mainstream' | 'radical' = 'mainstream'): CandidateSetup {
  const p = generatePlatform(party, profile, style, seed);
  return { name, party, profile, homeState, positions: p.positions, platform: p.platform, manifesto: p.manifesto, slogan: p.slogan };
}

export function makeGame(seed: number, opts: Partial<GameSettings> & { three?: boolean } = {}) {
  const setups = [makeSetup('Alex Carter', 'DEM', 'governor', 'MI', seed + 1), makeSetup('Jordan Hayes', 'REP', 'senator', 'OH', seed + 2)];
  if (opts.three) setups.push(makeSetup('Sam Rivera', 'LIB', 'business', 'CO', seed + 3));
  return createGame(setups, {
    totalDays: opts.totalDays ?? 60,
    difficulty: opts.difficulty ?? 'normal',
    incumbentParty: opts.incumbentParty === undefined ? 'DEM' : opts.incumbentParty,
    playerIndex: opts.playerIndex === undefined ? null : opts.playerIndex,
    seed,
  });
}
