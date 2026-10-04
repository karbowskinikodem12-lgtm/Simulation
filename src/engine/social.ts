// Social media: followers, engagement, buzz and viral moments. Buzz feeds the voter model
// mostly through young voters (see SOCIAL_W in groups.ts) and drives small-dollar donations,
// but its utility weight is capped so the internet alone cannot decide an election.

import type { Candidate, GameState, SocialState, SocialStrategy } from './types';
import type { Rng } from './rng';
import { clamp } from './util';
import { pushKeyEvent, pushNews } from './news';

export const SOCIAL_STRATEGY_META: Record<SocialStrategy, { label: string; icon: string; desc: string; engagement: number; viralBonus: number; negativeRisk: number }> = {
  positive: { label: 'Pozytywny przekaz', icon: '☀️', desc: 'Historie wyborców, optymizm. Stabilnie poprawia wizerunek, rzadko się „wykoleja”.', engagement: 3.5, viralBonus: 0, negativeRisk: 0.12 },
  policy: { label: 'Merytoryka', icon: '📊', desc: 'Wykresy, plany, fact-checki. Niski zasięg, buduje wiarygodność.', engagement: 2.4, viralBonus: -0.01, negativeRisk: 0.08 },
  attack: { label: 'Ataki i memy', icon: '🗡️', desc: 'Punktowanie rywala. Duże zasięgi i osłabienie rywala, ale ryzyko kompromitacji.', engagement: 5.2, viralBonus: 0.02, negativeRisk: 0.35 },
  viral: { label: 'Trendy i rozrywka', icon: '🎬', desc: 'Influencerzy, trendy, humor. Najwyższa szansa na viral — w obie strony.', engagement: 6.0, viralBonus: 0.04, negativeRisk: 0.3 },
};

export function initialSocial(c: Pick<Candidate, 'profile' | 'stats' | 'party'>, rng: Rng): SocialState {
  const base = c.party === 'DEM' || c.party === 'REP' ? 6 : 1.5;
  const celeb = c.profile === 'celebrity' ? 3 : 1;
  return {
    followers: Math.round(base * celeb * (0.6 + c.stats.media / 100) * rng.range(0.8, 1.25) * 10) / 10,
    engagement: 2.5 + c.stats.media / 50,
    buzz: 0,
    strategy: c.profile === 'celebrity' ? 'viral' : 'positive',
  };
}

export function viralPotential(c: Candidate): number {
  return clamp((c.stats.media * 0.5 + c.stats.charisma * 0.3 + (c.profile === 'celebrity' ? 15 : 0)) / 100, 0, 1);
}

/** One day of social media dynamics for every candidate. */
export function stepSocial(game: GameState, rng: Rng) {
  for (const c of game.candidates) {
    const s = c.social;
    const meta = SOCIAL_STRATEGY_META[s.strategy];
    s.buzz = clamp(s.buzz * 0.9, -1, 1);
    s.engagement = clamp(s.engagement + (meta.engagement * (0.8 + c.stats.media / 250) * (1 + s.buzz * 0.5) - s.engagement) * 0.08, 0.5, 12);
    s.followers = Math.max(0.05, s.followers * (1 + 0.0015 + 0.004 * s.buzz + c.momentum * 0.002));

    // Daily strategy side effects.
    if (s.strategy === 'positive') c.favorability = clamp(c.favorability + 0.03, -50, 50);
    if (s.strategy === 'policy') c.favorability = clamp(c.favorability + 0.015, -50, 50);
    if (s.strategy === 'attack') {
      const rival = game.candidates.filter((x) => x.id !== c.id).sort((a, b) => b.momentum - a.momentum)[0];
      if (rival) {
        rival.favorability = clamp(rival.favorability - 0.04, -50, 50);
        rival.social.buzz = clamp(rival.social.buzz - 0.01, -1, 1);
      }
      c.favorability = clamp(c.favorability - 0.015, -50, 50);
    }

    // Viral moments.
    const p = 0.02 + viralPotential(c) * 0.035 + meta.viralBonus + Math.max(0, s.engagement - 4) * 0.004;
    if (!rng.chance(p)) continue;
    const negative = rng.chance(meta.negativeRisk * (1.2 - c.stats.discipline / 200));
    const views = Math.round(rng.range(8, 45) * (0.6 + viralPotential(c)));
    if (negative) {
      s.buzz = clamp(s.buzz - rng.range(0.3, 0.55), -1, 1);
      c.favorability = clamp(c.favorability - rng.range(0.8, 2.2), -50, 50);
      c.momentum -= 0.02;
      const line = rng.pick(['niezręczny film z kampanii staje się memem', 'usunięty wpis krąży w zrzutach ekranu', 'nagranie z ostrą wymianą zdań z wyborcą obiega sieć', 'nieudany trend z TikToka ośmiesza sztab']);
      pushNews(game, `Viral w złą stronę: ${c.name} — ${line} (${views} mln wyświetleń)`, { candId: c.id, tone: 'bad', category: 'social', severity: views > 30 ? 'moderate' : 'minor' });
      if (views > 30) pushKeyEvent(game, { text: `Kompromitujący viral: ${c.name}`, candId: c.id, impact: -2 });
    } else {
      s.buzz = clamp(s.buzz + rng.range(0.3, 0.6), -1, 1);
      s.followers *= 1 + rng.range(0.02, 0.06);
      c.momentum += 0.025;
      c.enthusiasm = clamp(c.enthusiasm + 1, 0, 100);
      const line = rng.pick(['film z wiecu bije rekordy wyświetleń', 'riposta w wywiadzie staje się hitem internetu', 'spontaniczna rozmowa z wyborcą podbija sieć', 'mem z udziałem kandydata obiega cały internet']);
      pushNews(game, `Viral: ${c.name} — ${line} (${views} mln wyświetleń)`, { candId: c.id, tone: 'good', category: 'social', severity: views > 30 ? 'moderate' : 'minor' });
      if (views > 30) pushKeyEvent(game, { text: `Viralowy sukces: ${c.name}`, candId: c.id, impact: 2 });
    }
  }
}

/** Default social media strategy of an AI candidate. */
export function aiSocialStrategy(c: Candidate): SocialStrategy {
  switch (c.style) {
    case 'aggressive':
      return 'attack';
    case 'media':
      return 'viral';
    case 'establishment':
      return 'policy';
    default:
      return c.momentum < -0.05 ? 'attack' : 'positive';
  }
}

