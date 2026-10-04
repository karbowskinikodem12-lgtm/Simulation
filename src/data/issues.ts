import type { IssueId } from '../engine/types';

export interface IssueDef {
  id: IssueId;
  label: string;
  short: string;
  icon: string;
  left: string; // what -100 means
  right: string; // what +100 means
  /** Baseline share of public attention (normalised later). */
  baseSalience: number;
  /** Where the national median voter sits (-100..100) before state adjustments. */
  center: number;
}

export const ISSUES: IssueDef[] = [
  { id: 'economy', label: 'Gospodarka', short: 'Gosp.', icon: '📈', left: 'Interwencjonizm państwa', right: 'Wolny rynek i deregulacja', baseSalience: 1.4, center: 6 },
  { id: 'inflation', label: 'Inflacja i koszty życia', short: 'Inflacja', icon: '🛒', left: 'Kontrola cen i dopłaty', right: 'Cięcie wydatków państwa', baseSalience: 1.3, center: 4 },
  { id: 'jobs', label: 'Rynek pracy i bezrobocie', short: 'Praca', icon: '🏭', left: 'Związki zawodowe, płaca minimalna', right: 'Elastyczny rynek, ulgi dla firm', baseSalience: 1.0, center: -4 },
  { id: 'immigration', label: 'Imigracja', short: 'Imigr.', icon: '🛂', left: 'Ścieżka do obywatelstwa', right: 'Mur i masowe deportacje', baseSalience: 1.1, center: 14 },
  { id: 'taxes', label: 'Podatki', short: 'Podatki', icon: '💵', left: 'Wyższe podatki dla bogatych', right: 'Niskie podatki dla wszystkich', baseSalience: 0.8, center: 2 },
  { id: 'healthcare', label: 'Opieka zdrowotna', short: 'Zdrowie', icon: '🏥', left: 'Publiczny system (Medicare for All)', right: 'Prywatne ubezpieczenia', baseSalience: 1.0, center: -14 },
  { id: 'security', label: 'Bezpieczeństwo i przestępczość', short: 'Bezp.', icon: '🚔', left: 'Reforma policji', right: 'Prawo i porządek', baseSalience: 0.8, center: 12 },
  { id: 'foreign', label: 'Polityka zagraniczna', short: 'Zagr.', icon: '🌐', left: 'Dyplomacja i sojusze', right: 'Siła militarna, America First', baseSalience: 0.6, center: 2 },
  { id: 'climate', label: 'Klimat i energia', short: 'Klimat', icon: '🌱', left: 'Zielona transformacja', right: 'Paliwa kopalne, niezależność', baseSalience: 0.6, center: -4 },
  { id: 'social', label: 'Kwestie światopoglądowe', short: 'Społ.', icon: '⚖️', left: 'Progresywne prawa obywatelskie', right: 'Tradycyjne wartości', baseSalience: 0.7, center: -4 },
  { id: 'education', label: 'Edukacja', short: 'Eduk.', icon: '🎓', left: 'Darmowe studia, szkoły publiczne', right: 'Bony edukacyjne, wybór szkoły', baseSalience: 0.5, center: -4 },
];

export const ISSUE_BY_ID = Object.fromEntries(ISSUES.map((i) => [i.id, i])) as Record<IssueId, IssueDef>;
export const ISSUE_IDS = ISSUES.map((i) => i.id);

export function emptyPositions(v = 0): Record<IssueId, number> {
  return Object.fromEntries(ISSUE_IDS.map((id) => [id, v])) as Record<IssueId, number>;
}

/** Human readable description of a position value. */
export function positionLabel(v: number): string {
  if (v <= -65) return 'Skrajnie progresywne';
  if (v <= -30) return 'Progresywne';
  if (v < -10) return 'Centrolewicowe';
  if (v <= 10) return 'Centrowe';
  if (v < 30) return 'Centroprawicowe';
  if (v < 65) return 'Konserwatywne';
  return 'Skrajnie konserwatywne';
}
