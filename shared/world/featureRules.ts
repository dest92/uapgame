import { parsePositive } from './buildingRules';
import type { Tags } from './reference';

export type RoadClass = 'road' | 'path';
export type Surface = 'asphalt' | 'paved' | 'concrete' | 'gravel' | 'unpaved' | 'grass';
export type AreaKind =
  | 'park' | 'garden' | 'grass' | 'pitch' | 'parking' | 'water' | 'track' | 'plaza' | 'sports';

const ROAD_TYPES = new Set([
  'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential',
  'living_street', 'service', 'road',
]);
const PATH_TYPES = new Set(['footway', 'path', 'pedestrian', 'steps', 'cycleway', 'track', 'bridleway']);

export function classifyHighway(highway: string | undefined): RoadClass | null {
  if (!highway) return null;
  if (ROAD_TYPES.has(highway)) return 'road';
  if (PATH_TYPES.has(highway)) return 'path';
  return null;
}

const WIDTHS: Readonly<Record<string, number>> = {
  motorway: 12, trunk: 10, primary: 9, secondary: 7.5, tertiary: 7, unclassified: 6,
  residential: 6, living_street: 5, service: 4, road: 5, pedestrian: 3, footway: 2.2,
  path: 2, cycleway: 2.2, track: 3, bridleway: 2, steps: 2,
};

export function roadWidth(highway: string, widthTag?: string): number {
  return parsePositive(widthTag) ?? WIDTHS[highway] ?? 4;
}

const SURFACES: Readonly<Record<string, Surface>> = {
  asphalt: 'asphalt', paved: 'paved', concrete: 'concrete', 'concrete:plates': 'concrete',
  paving_stones: 'paved', sett: 'paved', cobblestone: 'paved', bricks: 'paved',
  compacted: 'gravel', gravel: 'gravel', fine_gravel: 'gravel', pebblestone: 'gravel',
  unpaved: 'unpaved', dirt: 'unpaved', earth: 'unpaved', ground: 'unpaved', sand: 'unpaved',
  mud: 'unpaved', grass: 'grass',
};

export function normalizeSurface(surface: string | undefined, highway: string): Surface {
  const known = surface ? SURFACES[surface] : undefined;
  if (known) return known;
  return classifyHighway(highway) === 'path' ? 'paved' : 'asphalt';
}

export function classifyArea(tags: Tags): AreaKind | null {
  const leisure = tags['leisure'];
  const landuse = tags['landuse'];
  if (leisure === 'park') return 'park';
  if (leisure === 'garden') return 'garden';
  if (leisure === 'pitch') return 'pitch';
  if (leisure === 'track') return 'track';
  if (leisure === 'swimming_pool' || tags['natural'] === 'water' || tags['amenity'] === 'fountain') return 'water';
  if (leisure === 'sports_centre' || leisure === 'playground') return 'sports';
  if (tags['amenity'] === 'parking') return 'parking';
  if (tags['highway'] === 'pedestrian' || tags['place'] === 'square') return 'plaza';
  if (landuse === 'grass' || landuse === 'religious' || landuse === 'recreation_ground' ||
      landuse === 'meadow' || landuse === 'village_green' || tags['natural'] === 'grassland') return 'grass';
  return null;
}
