import type { IssueId } from '../engine/types';
import { L, type LStr } from '../i18n';

export interface IssueDef {
  id: IssueId;
  label: LStr;
  short: LStr;
  icon: string;
  left: LStr; // what -100 means
  right: LStr; // what +100 means
  /** Baseline share of public attention (normalised later). */
  baseSalience: number;
  /** Where the national median voter sits (-100..100) before state adjustments. */
  center: number;
}

export const ISSUES: IssueDef[] = [
  { id: 'economy', label: L('Gospodarka', 'Economy'), short: L('Gosp.', 'Econ.'), icon: '📈', left: L('Interwencjonizm państwa', 'State intervention'), right: L('Wolny rynek i deregulacja', 'Free market & deregulation'), baseSalience: 1.4, center: 6 },
  { id: 'inflation', label: L('Inflacja i koszty życia', 'Inflation & cost of living'), short: L('Inflacja', 'Inflation'), icon: '🛒', left: L('Kontrola cen i dopłaty', 'Price controls & subsidies'), right: L('Cięcie wydatków państwa', 'Cutting government spending'), baseSalience: 1.3, center: 4 },
  { id: 'jobs', label: L('Rynek pracy i bezrobocie', 'Jobs & unemployment'), short: L('Praca', 'Jobs'), icon: '🏭', left: L('Związki zawodowe, płaca minimalna', 'Unions, minimum wage'), right: L('Elastyczny rynek, ulgi dla firm', 'Flexible market, business tax breaks'), baseSalience: 1.0, center: -4 },
  { id: 'immigration', label: L('Imigracja', 'Immigration'), short: L('Imigr.', 'Immig.'), icon: '🛂', left: L('Ścieżka do obywatelstwa', 'Path to citizenship'), right: L('Mur i masowe deportacje', 'Border wall & mass deportations'), baseSalience: 1.1, center: 14 },
  { id: 'taxes', label: L('Podatki', 'Taxes'), short: L('Podatki', 'Taxes'), icon: '💵', left: L('Wyższe podatki dla bogatych', 'Higher taxes on the rich'), right: L('Niskie podatki dla wszystkich', 'Low taxes for everyone'), baseSalience: 0.8, center: 2 },
  { id: 'healthcare', label: L('Opieka zdrowotna', 'Healthcare'), short: L('Zdrowie', 'Health'), icon: '🏥', left: L('Publiczny system (Medicare dla wszystkich)', 'Single-payer (Medicare for All)'), right: L('Prywatne ubezpieczenia', 'Private insurance'), baseSalience: 1.0, center: -14 },
  { id: 'security', label: L('Bezpieczeństwo i przestępczość', 'Crime & public safety'), short: L('Bezp.', 'Safety'), icon: '🚔', left: L('Reforma policji', 'Police reform'), right: L('Prawo i porządek', 'Law and order'), baseSalience: 0.8, center: 12 },
  { id: 'foreign', label: L('Polityka zagraniczna', 'Foreign policy'), short: L('Zagr.', 'Foreign'), icon: '🌐', left: L('Dyplomacja i sojusze', 'Diplomacy & alliances'), right: L('Siła militarna, „Ameryka przede wszystkim”', 'Military strength, America First'), baseSalience: 0.6, center: 2 },
  { id: 'climate', label: L('Klimat i energia', 'Climate & energy'), short: L('Klimat', 'Climate'), icon: '🌱', left: L('Zielona transformacja', 'Green transition'), right: L('Paliwa kopalne, niezależność', 'Fossil fuels, energy independence'), baseSalience: 0.6, center: -4 },
  { id: 'social', label: L('Kwestie światopoglądowe', 'Social issues'), short: L('Społ.', 'Social'), icon: '⚖️', left: L('Progresywne prawa obywatelskie', 'Progressive civil rights'), right: L('Tradycyjne wartości', 'Traditional values'), baseSalience: 0.7, center: -4 },
  { id: 'education', label: L('Edukacja', 'Education'), short: L('Eduk.', 'Educ.'), icon: '🎓', left: L('Darmowe studia, szkoły publiczne', 'Free college, public schools'), right: L('Bony edukacyjne, wybór szkoły', 'Vouchers, school choice'), baseSalience: 0.5, center: -4 },
];

export const ISSUE_BY_ID = Object.fromEntries(ISSUES.map((i) => [i.id, i])) as Record<IssueId, IssueDef>;
export const ISSUE_IDS = ISSUES.map((i) => i.id);

export function emptyPositions(v = 0): Record<IssueId, number> {
  return Object.fromEntries(ISSUE_IDS.map((id) => [id, v])) as Record<IssueId, number>;
}

/** Human readable description of a position value. */
export function positionLabel(v: number): LStr {
  if (v <= -65) return L('Skrajnie progresywne', 'Very progressive');
  if (v <= -30) return L('Progresywne', 'Progressive');
  if (v < -10) return L('Centrolewicowe', 'Center-left');
  if (v <= 10) return L('Centrowe', 'Centrist');
  if (v < 30) return L('Centroprawicowe', 'Center-right');
  if (v < 65) return L('Konserwatywne', 'Conservative');
  return L('Skrajnie konserwatywne', 'Very conservative');
}
