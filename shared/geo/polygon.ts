import type { BBox2, Vec2 } from './types';

/**
 * Área con signo en vista de mapa (Este, Norte). Positiva = antihoraria (CCW).
 * Como Z apunta al Sur, se usa Norte = −Z.
 */
export function signedArea(poly: readonly Vec2[]): number {
  let sum = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    sum += a.x * -b.z - b.x * -a.z;
  }
  return sum / 2;
}

export const polygonArea = (poly: readonly Vec2[]): number => Math.abs(signedArea(poly));

export function ensureCCW(poly: readonly Vec2[]): Vec2[] {
  return signedArea(poly) < 0 ? [...poly].reverse() : [...poly];
}

export function dedupeClosingPoint(poly: readonly Vec2[]): Vec2[] {
  if (poly.length < 2) return [...poly];
  const first = poly[0]!;
  const last = poly[poly.length - 1]!;
  return first.x === last.x && first.z === last.z ? poly.slice(0, -1) : [...poly];
}

/** Centroide de área (cae al promedio de vértices si el área es ~0). */
export function centroid(poly: readonly Vec2[]): Vec2 {
  let a = 0;
  let cx = 0;
  let cz = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % n]!;
    const cross = p.x * q.z - q.x * p.z;
    a += cross;
    cx += (p.x + q.x) * cross;
    cz += (p.z + q.z) * cross;
  }
  if (Math.abs(a) < 1e-9) {
    const s = poly.reduce((acc, p) => ({ x: acc.x + p.x, z: acc.z + p.z }), { x: 0, z: 0 });
    return { x: s.x / poly.length, z: s.z / poly.length };
  }
  return { x: cx / (3 * a), z: cz / (3 * a) };
}

/** Ray casting par/impar. */
export function pointInPolygon(p: Vec2, poly: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  if (len2 === 0) return { x: a.x, z: a.z };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
  return { x: a.x + t * dx, z: a.z + t * dz };
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  return distance(p, closestPointOnSegment(p, a, b));
}

/** Distancia mínima de un punto a una polilínea abierta. */
export function distanceToPolyline(p: Vec2, line: readonly Vec2[]): number {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    best = Math.min(best, distanceToSegment(p, line[i]!, line[i + 1]!));
  }
  return best;
}

export function bboxOf(points: readonly Vec2[]): BBox2 {
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minZ = Math.min(minZ, p.z);
    maxX = Math.max(maxX, p.x);
    maxZ = Math.max(maxZ, p.z);
  }
  return { minX, minZ, maxX, maxZ };
}

export function expandBBox(bb: BBox2, margin: number): BBox2 {
  return { minX: bb.minX - margin, minZ: bb.minZ - margin, maxX: bb.maxX + margin, maxZ: bb.maxZ + margin };
}

export const bboxContains = (bb: BBox2, p: Vec2): boolean =>
  p.x >= bb.minX && p.x <= bb.maxX && p.z >= bb.minZ && p.z <= bb.maxZ;

export const bboxIntersects = (a: BBox2, b: BBox2): boolean =>
  a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
