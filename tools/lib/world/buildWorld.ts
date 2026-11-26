import type { FeatureCollection } from 'geojson';
import { createEnuProjection } from '../../../shared/geo/enu';
import { bboxOf, centroid, ensureCCW, expandBBox } from '../../../shared/geo/polygon';
import type { GeoPoint } from '../../../shared/geo/types';
import type { ReferenceSummary } from '../../../shared/world/reference';
import { WORLD_SCHEMA_VERSION, type TerrainData, type WorldData } from '../../../shared/world/types';
import { buildBuilding } from './buildings';
import { roundVec, toOsmFeature, type OsmFeature } from './features';
import type { MissingInfo } from './missingInfo';
import { buildArea, buildRoads } from './network';
import { buildPoi, buildTree } from './points';

export interface BuildWorldInput {
  readonly geojson: FeatureCollection;
  readonly campus: { readonly id: string; readonly name: string; readonly outline: readonly GeoPoint[] };
  readonly marginMeters: number;
  readonly references: ReadonlyMap<string, ReferenceSummary>;
  readonly generatedAt: string;
  readonly terrain?: TerrainData;
}

export interface BuildWorldOutput {
  readonly world: WorldData;
  readonly missing: readonly MissingInfo[];
}

export const ATTRIBUTION = '© OpenStreetMap contributors (ODbL)';

/** Pipeline puro GeoJSON OSM → WorldData (spec 003). Sin IO: testeable. */
export function buildWorld(input: BuildWorldInput): BuildWorldOutput {
  // WLD-1: origen ENU en el centroide del perímetro del campus.
  const roughProj = createEnuProjection(input.campus.outline[0]!);
  const roughOutline = input.campus.outline.map((p) => roughProj.toLocal(p));
  const origin = roughProj.toGeo(centroid(roughOutline));
  const proj = createEnuProjection({ lon: round6(origin.lon), lat: round6(origin.lat) });

  const outline = ensureCCW(input.campus.outline.map((p) => roundVec(proj.toLocal(p))));
  const bounds = expandBBox(bboxOf(outline), input.marginMeters);
  const features = input.geojson.features.map(toOsmFeature).filter((f): f is OsmFeature => f !== null);
  const missing: MissingInfo[] = [];

  const roads = features.flatMap((f) => buildRoads(f, proj, bounds));
  const areas = features.map((f) => buildArea(f, proj, bounds)).filter((a) => a !== null);
  const trees = features.map((f) => buildTree(f, proj, bounds)).filter((t) => t !== null);
  const pois = features
    .filter((f) => f.geometry.type === 'Point' || !f.tags['building'])
    .map((f) => buildPoi(f, proj, bounds))
    .filter((p) => p !== null);

  const ctx = { proj, bounds, references: input.references, paths: roads.map((r) => r.points), pois };
  const buildings = features
    .filter((f) => f.tags['building'] && f.geometry.type !== 'Point' && f.tags['building'] !== 'roof')
    .map((f) => buildBuilding(f, ctx, missing))
    .filter((b) => b !== null);

  const terrain = input.terrain ?? { kind: 'flat' as const, source: 'Sin MDE: plano con ondulación procedural (TODO: reference/terrain/*.tif)' };
  if (terrain.kind === 'flat') {
    missing.push({ id: 'terrain', name: 'Terreno', issue: 'terreno-plano', detail: terrain.source });
  }

  return {
    world: {
      version: WORLD_SCHEMA_VERSION,
      generatedAt: input.generatedAt,
      attribution: ATTRIBUTION,
      origin: proj.origin,
      bounds,
      campus: { id: input.campus.id, name: input.campus.name, outline },
      terrain,
      buildings,
      roads,
      areas,
      trees,
      pois,
    },
    missing,
  };
}

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;
