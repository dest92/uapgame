import type { GeoPoint, Vec2 } from './types';

export interface EnuProjection {
  readonly origin: GeoPoint;
  toLocal(p: GeoPoint): Vec2;
  toGeo(p: Vec2): GeoPoint;
}

const DEG = Math.PI / 180;

/**
 * Proyección tangente local (East-North-Up) centrada en `origin`.
 * Usa los radios de curvatura del elipsoide WGS84 en la latitud de origen; para
 * áreas de pocos km el error es de centímetros, sobrado para un campus.
 * Devuelve X = Este y Z = Sur (convención del motor: Norte = −Z).
 */
export function createEnuProjection(origin: GeoPoint): EnuProjection {
  const phi = origin.lat * DEG;
  const metersPerDegLat =
    111132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi) - 0.0023 * Math.cos(6 * phi);
  const metersPerDegLon =
    111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi) + 0.118 * Math.cos(5 * phi);

  return {
    origin,
    toLocal: (p) => ({
      x: (p.lon - origin.lon) * metersPerDegLon,
      z: -(p.lat - origin.lat) * metersPerDegLat,
    }),
    toGeo: (p) => ({
      lon: origin.lon + p.x / metersPerDegLon,
      lat: origin.lat - p.z / metersPerDegLat,
    }),
  };
}
