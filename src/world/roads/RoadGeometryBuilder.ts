import type { Vec2 } from '@shared/geo/types';
import type { HeightSampler } from '@shared/terrain/heightField';
import type { RoadData } from '@shared/world/types';
import { emptyGeometry, pushVertex, type GeometryData } from '../geometry/GeometryData';
import { surfaceColor } from './surfaces';

/** Las calles van por encima de los senderos que las cruzan. */
const LIFT = { road: 0.09, path: 0.05 } as const;
const CURB = { road: { height: 0.15, width: 0.3 }, path: { height: 0.06, width: 0.15 } } as const;

export interface RoadGeometry {
  readonly surface: GeometryData;
  readonly curb: GeometryData;
}

/** Inserta puntos para que ningún tramo supere `maxStep` metros (seguir el terreno). */
export function resamplePolyline(points: readonly Vec2[], maxStep: number): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / maxStep));
    for (let k = 0; k < n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
  }
  out.push(points[points.length - 1]!);
  return out;
}

/** Normales laterales (izquierda) con miter limitado en cada vértice. */
function sideNormals(pts: readonly Vec2[]): { n: Vec2; scale: number }[] {
  return pts.map((p, i) => {
    const prev = pts[Math.max(0, i - 1)]!;
    const next = pts[Math.min(pts.length - 1, i + 1)]!;
    const t1 = norm({ x: p.x - prev.x, z: p.z - prev.z });
    const t2 = norm({ x: next.x - p.x, z: next.z - p.z });
    const t = norm({ x: t1.x + t2.x, z: t1.z + t2.z });
    const n = { x: -t.z, z: t.x };
    const ref = i > 0 ? t1 : t2;
    const cos = Math.abs(n.x * -ref.z + n.z * ref.x);
    return { n, scale: 1 / Math.max(0.5, cos) };
  });
}

function norm(v: Vec2): Vec2 {
  const l = Math.hypot(v.x, v.z);
  return l < 1e-9 ? { x: 1, z: 0 } : { x: v.x / l, z: v.z / l };
}

/** ¿El punto (x, z) cae sobre la calzada de otra calle? (para cortar cordones en cruces). */
export type CoveredTest = (x: number, z: number) => boolean;

/** Hacia dónde mira una tira: arriba o lateral (múltiplo de la normal izquierda del eje). */
type Facing = 'up' | 1 | -1;

/** Tira de quads entre dos offsets laterales a alturas dadas, con normales y winding coherentes. */
function strip(
  g: GeometryData, pts: readonly Vec2[], sides: ReturnType<typeof sideNormals>, h: HeightSampler,
  o0: number, o1: number, y0: number, y1: number, color: readonly [number, number, number], facing: Facing,
  skip?: CoveredTest,
): void {
  let dist = 0;
  const base = g.positions.length / 3;
  pts.forEach((p, i) => {
    if (i > 0) dist += Math.hypot(p.x - pts[i - 1]!.x, p.z - pts[i - 1]!.z);
    const { n, scale } = sides[i]!;
    const normal: [number, number, number] = facing === 'up' ? [0, 1, 0] : [n.x * facing, 0, n.z * facing];
    for (const [o, y] of [[o0, y0], [o1, y1]] as const) {
      const x = p.x + n.x * o * scale;
      const z = p.z + n.z * o * scale;
      pushVertex(g, { p: [x, h.heightAt(x, z) + y, z], n: normal, uv: [o, dist], color });
    }
  });
  for (let i = 0; i < pts.length - 1; i++) {
    if (skip) {
      const k = (base + i * 2) * 3;
      const mx = (g.positions[k]! + g.positions[k + 6]!) / 2;
      const mz = (g.positions[k + 2]! + g.positions[k + 8]!) / 2;
      if (skip(mx, mz)) continue;
    }
    const a = base + i * 2;
    const tri: [number, number, number][] = [[a, a + 2, a + 1], [a + 1, a + 2, a + 3]];
    for (const t of tri) g.indices.push(...(facesNormal(g, t) ? t : ([t[0], t[2], t[1]] as const)));
  }
}

/** ¿La cara geométrica del triángulo apunta en la dirección de la normal del vértice? */
function facesNormal(g: GeometryData, [a, b, c]: readonly [number, number, number]): boolean {
  const P = (k: number, j: number): number => g.positions[k * 3 + j]!;
  const u = [P(b, 0) - P(a, 0), P(b, 1) - P(a, 1), P(b, 2) - P(a, 2)];
  const v = [P(c, 0) - P(a, 0), P(c, 1) - P(a, 1), P(c, 2) - P(a, 2)];
  const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
  return n[0]! * g.normals[a * 3]! + n[1]! * g.normals[a * 3 + 1]! + n[2]! * g.normals[a * 3 + 2]! >= 0;
}

/** Calzada + cordones (ROAD-1). UV en metros: u lateral, v longitudinal. */
export function buildRoadGeometry(road: RoadData, terrain: HeightSampler, covered?: CoveredTest): RoadGeometry {
  const surface = emptyGeometry();
  const curb = emptyGeometry();
  const pts = resamplePolyline(road.points, 3);
  const sides = sideNormals(pts);
  const half = road.width / 2;
  const lift = LIFT[road.class];
  const c = CURB[road.class];
  const color = surfaceColor(road.surface);
  const curbColor = surfaceColor(road.class === 'road' ? 'concrete' : 'curb');

  strip(surface, pts, sides, terrain, half, -half, lift, lift, color, 'up');
  for (const s of [1, -1] as const) {
    // Cara interior (mira a la calzada), tapa y cara exterior del cordón.
    strip(curb, pts, sides, terrain, s * half, s * half, lift, lift + c.height, curbColor, -s as 1 | -1, covered);
    strip(curb, pts, sides, terrain, s * (half + c.width), s * half, lift + c.height, lift + c.height, curbColor, 'up', covered);
    strip(curb, pts, sides, terrain, s * (half + c.width), s * (half + c.width), lift + c.height, lift - 0.05, curbColor, s, covered);
  }
  return { surface, curb };
}
