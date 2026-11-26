import type { EnuProjection } from '../../../shared/geo/enu';
import { clipPolylineToBBox, clipPolygonToBBox } from '../../../shared/geo/clip';
import { dedupeClosingPoint, ensureCCW, polygonArea } from '../../../shared/geo/polygon';
import type { BBox2, Vec2 } from '../../../shared/geo/types';
import { classifyArea, classifyHighway, normalizeSurface, roadWidth } from '../../../shared/world/featureRules';
import type { AreaData, RoadData } from '../../../shared/world/types';
import { outerRing, projectRing, roundVec, type OsmFeature } from './features';

const linePoints = (f: OsmFeature, proj: EnuProjection): Vec2[] | null => {
  if (f.geometry.type !== 'LineString') return null;
  return projectRing(f.geometry.coordinates, proj);
};

/** Calles y senderos (WLD-6). Áreas peatonales cerradas se tratan como áreas. */
export function buildRoads(f: OsmFeature, proj: EnuProjection, bounds: BBox2): RoadData[] {
  const highway = f.tags['highway'];
  const cls = classifyHighway(highway);
  if (!cls || !highway || f.tags['area'] === 'yes') return [];
  const pts = linePoints(f, proj);
  if (!pts) return [];
  const parts = clipPolylineToBBox(pts, bounds);
  return parts.map((points, i) => ({
    id: parts.length > 1 ? `${f.id}#${i}` : f.id,
    class: cls,
    highway,
    ...(f.tags['name'] ? { name: f.tags['name'] } : {}),
    width: roadWidth(highway, f.tags['width']),
    surface: normalizeSurface(f.tags['surface'], highway),
    points: points.map(roundVec),
  }));
}

/** Áreas verdes, canchas, estacionamientos, agua… (WLD-7). */
export function buildArea(f: OsmFeature, proj: EnuProjection, bounds: BBox2): AreaData | null {
  if (f.tags['building']) return null;
  const kind = classifyArea(f.tags);
  const ring = kind ? outerRing(f.geometry) : null;
  if (!kind || !ring) return null;
  const clipped = clipPolygonToBBox(dedupeClosingPoint(projectRing(ring, proj)), bounds);
  if (clipped.length < 3 || polygonArea(clipped) < 4) return null;
  return {
    id: f.id,
    kind,
    ...(f.tags['name'] ? { name: f.tags['name'] } : {}),
    ...(f.tags['sport'] ? { sport: f.tags['sport'] } : {}),
    polygon: ensureCCW(clipped).map(roundVec),
  };
}
