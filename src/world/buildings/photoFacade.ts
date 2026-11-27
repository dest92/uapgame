import type { BuildingData } from '@shared/world/types';
import { closestPointOnSegment, distance, ensureCCW } from '@shared/geo/polygon';
import { emptyGeometry, pushVertex, type GeometryData } from '../geometry/GeometryData';

const OFFSET = 0.04;

/**
 * Quad con UV 0..1 sobre la pared de la entrada (la arista más cercana a la entrada),
 * apenas despegado de la pared, para aplicar una foto real de la fachada.
 */
export function photoFacadeGeometry(b: BuildingData, groundY: number): GeometryData {
  const poly = ensureCCW(b.footprint);
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const d = distance(closestPointOnSegment(b.entrance.position, poly[i]!, poly[(i + 1) % poly.length]!), b.entrance.position);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  const a = poly[best]!;
  const c = poly[(best + 1) % poly.length]!;
  const len = Math.hypot(c.x - a.x, c.z - a.z) || 1;
  const n = { x: -(c.z - a.z) / len, z: (c.x - a.x) / len };
  const g = emptyGeometry();
  const y0 = groundY;
  const y1 = groundY + b.height;
  const P = (p: { x: number; z: number }, y: number): [number, number, number] => [p.x + n.x * OFFSET, y, p.z + n.z * OFFSET];
  const nn: [number, number, number] = [n.x, 0, n.z];
  const w: [number, number, number] = [1, 1, 1];
  const i0 = pushVertex(g, { p: P(a, y0), n: nn, uv: [0, 0], color: w });
  const i1 = pushVertex(g, { p: P(c, y0), n: nn, uv: [1, 0], color: w });
  const i2 = pushVertex(g, { p: P(c, y1), n: nn, uv: [1, 1], color: w });
  const i3 = pushVertex(g, { p: P(a, y1), n: nn, uv: [0, 1], color: w });
  g.indices.push(i0, i1, i2, i0, i2, i3);
  return g;
}
