import type { BBox2, Vec2 } from './types';
import { bboxContains } from './polygon';

/** Liang–Barsky: recorta el segmento a-b al bbox. Devuelve null si queda afuera. */
function clipSegment(a: Vec2, b: Vec2, bb: BBox2): [Vec2, Vec2] | null {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const checks: [number, number][] = [
    [-dx, a.x - bb.minX], [dx, bb.maxX - a.x], [-dz, a.z - bb.minZ], [dz, bb.maxZ - a.z],
  ];
  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return null;
  }
  return [
    { x: a.x + t0 * dx, z: a.z + t0 * dz },
    { x: a.x + t1 * dx, z: a.z + t1 * dz },
  ];
}

const same = (a: Vec2, b: Vec2): boolean => Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.z - b.z) < 1e-9;

/** Recorta una polilínea al bbox; puede devolver varias partes. */
export function clipPolylineToBBox(line: readonly Vec2[], bb: BBox2): Vec2[][] {
  const parts: Vec2[][] = [];
  let current: Vec2[] = [];
  for (let i = 0; i < line.length - 1; i++) {
    const seg = clipSegment(line[i]!, line[i + 1]!, bb);
    if (!seg) {
      if (current.length >= 2) parts.push(current);
      current = [];
      continue;
    }
    const [s, e] = seg;
    if (current.length && same(current[current.length - 1]!, s)) current.push(e);
    else {
      if (current.length >= 2) parts.push(current);
      current = [s, e];
    }
    if (!bboxContains(bb, line[i + 1]!)) {
      parts.push(current);
      current = [];
    }
  }
  if (current.length >= 2) parts.push(current);
  return parts;
}

/** Sutherland–Hodgman contra los 4 lados del bbox. */
export function clipPolygonToBBox(poly: readonly Vec2[], bb: BBox2): Vec2[] {
  type Edge = { inside: (p: Vec2) => boolean; cut: (a: Vec2, b: Vec2) => Vec2 };
  const lerpX = (a: Vec2, b: Vec2, x: number): Vec2 => ({ x, z: a.z + ((b.z - a.z) * (x - a.x)) / (b.x - a.x) });
  const lerpZ = (a: Vec2, b: Vec2, z: number): Vec2 => ({ x: a.x + ((b.x - a.x) * (z - a.z)) / (b.z - a.z), z });
  const edges: Edge[] = [
    { inside: (p) => p.x >= bb.minX, cut: (a, b) => lerpX(a, b, bb.minX) },
    { inside: (p) => p.x <= bb.maxX, cut: (a, b) => lerpX(a, b, bb.maxX) },
    { inside: (p) => p.z >= bb.minZ, cut: (a, b) => lerpZ(a, b, bb.minZ) },
    { inside: (p) => p.z <= bb.maxZ, cut: (a, b) => lerpZ(a, b, bb.maxZ) },
  ];
  let out: Vec2[] = [...poly];
  for (const edge of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i]!;
      const prev = input[(i + input.length - 1) % input.length]!;
      if (edge.inside(cur)) {
        if (!edge.inside(prev)) out.push(edge.cut(prev, cur));
        out.push(cur);
      } else if (edge.inside(prev)) {
        out.push(edge.cut(prev, cur));
      }
    }
    if (!out.length) break;
  }
  return out;
}
