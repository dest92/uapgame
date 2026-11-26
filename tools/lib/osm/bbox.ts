import type { GeoBBox, GeoPoint } from '../../../shared/geo/types';
import { createEnuProjection } from '../../../shared/geo/enu';

export function geoBBoxOf(points: readonly GeoPoint[]): GeoBBox {
  return {
    west: Math.min(...points.map((p) => p.lon)),
    east: Math.max(...points.map((p) => p.lon)),
    south: Math.min(...points.map((p) => p.lat)),
    north: Math.max(...points.map((p) => p.lat)),
  };
}

/** Expande un bbox geográfico `meters` por lado (OSM-2). */
export function expandGeoBBox(bb: GeoBBox, meters: number): GeoBBox {
  const center = { lon: (bb.west + bb.east) / 2, lat: (bb.south + bb.north) / 2 };
  const proj = createEnuProjection(center);
  const sw = proj.toLocal({ lon: bb.west, lat: bb.south });
  const ne = proj.toLocal({ lon: bb.east, lat: bb.north });
  const sw2 = proj.toGeo({ x: sw.x - meters, z: sw.z + meters });
  const ne2 = proj.toGeo({ x: ne.x + meters, z: ne.z - meters });
  return { west: sw2.lon, south: sw2.lat, east: ne2.lon, north: ne2.lat };
}

export const bboxToOverpass = (bb: GeoBBox): string => `(${bb.south},${bb.west},${bb.north},${bb.east})`;
export const bboxToOsmApi = (bb: GeoBBox): string => `${bb.west},${bb.south},${bb.east},${bb.north}`;
