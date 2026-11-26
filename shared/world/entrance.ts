import type { Vec2 } from '../geo/types';
import { closestPointOnSegment, distance, ensureCCW } from '../geo/polygon';

export interface Entrance {
  readonly position: Vec2;
  /** Normal hacia afuera del edificio (unitaria, plano XZ). */
  readonly normal: Vec2;
}

const MAX_PATH_DISTANCE = 60;
const OUTSET = 0.5;

/** Normal exterior de la arista a→b para un polígono CCW en vista mapa (Norte = −Z). */
function outwardNormal(a: Vec2, b: Vec2): Vec2 {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  // En (x, n) con n = −z, la normal exterior de un CCW es (dn, −dx) → en z: (−dz, ... )
  return { x: -dz / len, z: dx / len };
}

const offset = (p: Vec2, n: Vec2, d: number): Vec2 => ({ x: p.x + n.x * d, z: p.z + n.z * d });

/** Par de puntos más cercanos entre los segmentos a-b (edificio) y p-q (camino). */
function closestOnEdgeToSegment(a: Vec2, b: Vec2, p: Vec2, q: Vec2): { point: Vec2; dist: number } {
  const candidates: { point: Vec2; dist: number }[] = [];
  for (const probe of [p, q]) {
    const onEdge = closestPointOnSegment(probe, a, b);
    candidates.push({ point: onEdge, dist: distance(onEdge, probe) });
  }
  for (const end of [a, b]) {
    const onPath = closestPointOnSegment(end, p, q);
    const onEdge = closestPointOnSegment(onPath, a, b);
    candidates.push({ point: onEdge, dist: distance(onEdge, onPath) });
  }
  return candidates.reduce((m, c) => (c.dist < m.dist ? c : m));
}

/** Aleja el punto de las esquinas: las puertas no suelen estar en el vértice. */
function clampAlongEdge(point: Vec2, a: Vec2, b: Vec2, margin = 0.2): Vec2 {
  const len = distance(a, b) || 1;
  const t = Math.min(1 - margin, Math.max(margin, ((point.x - a.x) * (b.x - a.x) + (point.z - a.z) * (b.z - a.z)) / (len * len)));
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

/**
 * Estima la entrada de un edificio: el punto de su contorno más cercano a un
 * camino (peatonal o calle). Ante empates gana la arista más larga (fachada).
 * Sin caminos cerca, el punto medio de la arista más larga.
 */
export function computeEntrance(footprint: readonly Vec2[], paths: readonly (readonly Vec2[])[]): Entrance {
  const poly = ensureCCW(footprint);
  let best: { edge: number; point: Vec2; score: number } | null = null;

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const edgeLen = distance(a, b);
    for (const path of paths) {
      for (let j = 0; j < path.length - 1; j++) {
        const c = closestOnEdgeToSegment(a, b, path[j]!, path[j + 1]!);
        if (c.dist > MAX_PATH_DISTANCE) continue;
        const score = c.dist - Math.min(edgeLen, 30) * 0.05;
        if (!best || score < best.score) best = { edge: i, point: c.point, score };
      }
    }
  }

  let edge = best?.edge;
  if (edge === undefined) {
    let longest = 0;
    edge = 0;
    for (let i = 0; i < poly.length; i++) {
      const len = distance(poly[i]!, poly[(i + 1) % poly.length]!);
      if (len > longest) {
        longest = len;
        edge = i;
      }
    }
  }
  const a = poly[edge]!;
  const b = poly[(edge + 1) % poly.length]!;
  const n = outwardNormal(a, b);
  const point = best ? clampAlongEdge(best.point, a, b) : midpoint(a, b);
  return { position: offset(point, n, OUTSET), normal: n };
}

const midpoint = (a: Vec2, b: Vec2): Vec2 => ({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
