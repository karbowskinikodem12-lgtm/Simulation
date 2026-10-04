// Pre-projected (Albers USA, 975x610) state outlines from us-atlas, converted once to SVG paths.

import { feature } from 'topojson-client';
import { geoPath } from 'd3-geo';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import usAtlas from 'us-atlas/states-albers-10m.json';
import { STATE_BY_FIPS } from '../../data/states';

export interface StateShape {
  code: string;
  d: string;
  centroid: [number, number];
  area: number;
}

const topo = usAtlas as unknown as Topology<{ states: GeometryCollection<{ name: string }> }>;
const path = geoPath();

export const MAP_WIDTH = 975;
export const MAP_HEIGHT = 610;

export const STATE_SHAPES: StateShape[] = (feature(topo, topo.objects.states).features as Feature<Geometry, { name: string }>[])
  .filter((f) => STATE_BY_FIPS[String(f.id)])
  .map((f) => ({
    code: STATE_BY_FIPS[String(f.id)].code,
    d: path(f) ?? '',
    centroid: path.centroid(f) as [number, number],
    area: path.area(f),
  }));

/** Small north-eastern states get callout boxes to the right of the map. */
export const CALLOUT_STATES = ['VT', 'NH', 'MA', 'RI', 'CT', 'NJ', 'DE', 'MD', 'DC'];

/** Manual label nudges where the geometric centroid looks off. */
export const LABEL_OFFSET: Record<string, [number, number]> = {
  FL: [12, 6],
  LA: [-8, 0],
  MI: [10, 22],
  KY: [6, 2],
  CA: [-8, 6],
  ID: [0, 16],
  WV: [-2, 4],
  VA: [6, 2],
  NY: [4, 0],
  AK: [0, 0],
  HI: [6, 6],
  MN: [-6, 0],
  OK: [8, 0],
  TX: [6, 0],
};
