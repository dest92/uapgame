/** Coordenada geográfica WGS84 en grados. */
export interface GeoPoint {
  readonly lon: number;
  readonly lat: number;
}

/** Punto en el plano horizontal local, en metros. X = Este, Z = Sur. */
export interface Vec2 {
  readonly x: number;
  readonly z: number;
}

export interface BBox2 {
  readonly minX: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxZ: number;
}

export interface GeoBBox {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
}
