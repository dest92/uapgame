import type { Feature, Geometry, Position } from 'geojson';
import type { Vec2 } from '../../../shared/geo/types';
import type { EnuProjection } from '../../../shared/geo/enu';
import type { Tags } from '../../../shared/world/reference';

/** Vista normalizada de un feature de osmtogeojson. */
export interface OsmFeature {
  readonly id: string;
  readonly tags: Tags;
  readonly geometry: Geometry;
}

export function toOsmFeature(f: Feature): OsmFeature | null {
  if (!f.geometry || f.id === undefined) return null;
  const props = (f.properties ?? {}) as { tags?: Record<string, string> };
  return { id: String(f.id), tags: props.tags ?? {}, geometry: f.geometry };
}

const round = (n: number): number => Math.round(n * 100) / 100;

export function projectRing(ring: readonly Position[], proj: EnuProjection): Vec2[] {
  return ring.map(([lon, lat]) => {
    const p = proj.toLocal({ lon: lon!, lat: lat! });
    return { x: round(p.x), z: round(p.z) };
  });
}

/** Anillo exterior principal (el de mayor longitud en multipolígonos). */
export function outerRing(geometry: Geometry): readonly Position[] | null {
  if (geometry.type === 'Polygon') return geometry.coordinates[0] ?? null;
  if (geometry.type === 'MultiPolygon') {
    const rings = geometry.coordinates.map((poly) => poly[0] ?? []);
    return rings.sort((a, b) => b.length - a.length)[0] ?? null;
  }
  if (geometry.type === 'LineString') {
    const c = geometry.coordinates;
    const first = c[0];
    const last = c[c.length - 1];
    return c.length >= 4 && first && last && first[0] === last[0] && first[1] === last[1] ? c : null;
  }
  return null;
}

export function pointOf(geometry: Geometry, proj: EnuProjection, centroidFn: (p: Vec2[]) => Vec2): Vec2 | null {
  if (geometry.type === 'Point') {
    const [lon, lat] = geometry.coordinates;
    const p = proj.toLocal({ lon: lon!, lat: lat! });
    return { x: round(p.x), z: round(p.z) };
  }
  const ring = outerRing(geometry);
  return ring ? centroidFn(projectRing(ring, proj)) : null;
}

export const roundVec = (p: Vec2): Vec2 => ({ x: round(p.x), z: round(p.z) });
