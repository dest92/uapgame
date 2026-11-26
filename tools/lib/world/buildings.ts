import type { EnuProjection } from '../../../shared/geo/enu';
import type { BBox2, Vec2 } from '../../../shared/geo/types';
import { bboxContains, centroid, dedupeClosingPoint, ensureCCW, pointInPolygon, polygonArea } from '../../../shared/geo/polygon';
import { resolveHeight, resolveName, resolveRoof } from '../../../shared/world/buildingRules';
import { computeEntrance } from '../../../shared/world/entrance';
import type { ReferenceSummary } from '../../../shared/world/reference';
import type { BuildingData, PoiData } from '../../../shared/world/types';
import { resolveAppearance } from './appearance';
import { outerRing, projectRing, roundVec, type OsmFeature } from './features';
import type { MissingInfo } from './missingInfo';

const MIN_AREA = 4;

export interface BuildingContext {
  readonly proj: EnuProjection;
  readonly bounds: BBox2;
  readonly references: ReadonlyMap<string, ReferenceSummary>;
  readonly paths: readonly (readonly Vec2[])[];
  readonly pois: readonly PoiData[];
}

export function buildBuilding(f: OsmFeature, ctx: BuildingContext, missing: MissingInfo[]): BuildingData | null {
  const ring = outerRing(f.geometry);
  if (!ring) return null;
  const footprint = ensureCCW(dedupeClosingPoint(projectRing(ring, ctx.proj)));
  if (footprint.length < 3 || polygonArea(footprint) < MIN_AREA) return null;
  const c = centroid(footprint);
  if (!bboxContains(ctx.bounds, c)) return null;

  const ref = ctx.references.get(f.id);
  const heightInfo = resolveHeight(f.tags, ref);
  const roof = resolveRoof(f.tags, heightInfo.height, ref);
  const nameInfo = resolveName(f.tags, f.id);
  const kind = f.tags['building'] ?? 'yes';
  const poiIds = ctx.pois.filter((p) => pointInPolygon(p.position, footprint)).map((p) => p.id);
  const entrance = computeEntrance(footprint, ctx.paths);

  if (!nameInfo.identified) {
    missing.push({ id: f.id, name: nameInfo.name, issue: 'sin-nombre', detail: 'OSM no tiene `name`.' });
  }
  if (!ref) {
    missing.push({ id: f.id, name: nameInfo.name, issue: 'sin-referencias', detail: 'materiales genéricos por tipo.' });
  }
  if (heightInfo.source === 'default') {
    missing.push({ id: f.id, name: nameInfo.name, issue: 'altura-estimada', detail: `${heightInfo.levels} niveles por defecto (${kind}).` });
  }

  return {
    id: f.id,
    name: nameInfo.name,
    identified: nameInfo.identified,
    kind,
    footprint,
    centroid: roundVec(c),
    height: Math.round(heightInfo.height * 100) / 100,
    minHeight: heightInfo.minHeight,
    levels: heightInfo.levels,
    heightSource: heightInfo.source,
    roof: { shape: roof.shape, height: Math.round(roof.height * 100) / 100 },
    appearance: resolveAppearance(kind, ref),
    entrance: { position: roundVec(entrance.position), normal: roundVec(entrance.normal) },
    poiIds,
  };
}
