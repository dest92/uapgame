import type { Vec2 } from '@shared/geo/types';
import { ensureCCW } from '@shared/geo/polygon';

export interface Placement extends Vec2 {
  readonly yaw: number;
}

/** Arbustos al pie de las fachadas cada `step` m, a `offset` m hacia afuera, despejando la entrada. */
export function shrubPositions(
  buildings: readonly { footprint: readonly Vec2[]; entrance: Vec2 }[], step: number, offset: number,
): Placement[] {
  const out: Placement[] = [];
  for (const b of buildings) {
    const poly = ensureCCW(b.footprint);
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!;
      const c = poly[(i + 1) % poly.length]!;
      const len = Math.hypot(c.x - a.x, c.z - a.z);
      if (len < 3) continue;
      const n = { x: -(c.z - a.z) / len, z: (c.x - a.x) / len };
      for (let d = 1.2; d < len - 1.2; d += step) {
        const p = { x: a.x + ((c.x - a.x) * d) / len + n.x * offset, z: a.z + ((c.z - a.z) * d) / len + n.z * offset };
        if (Math.hypot(p.x - b.entrance.x, p.z - b.entrance.z) < 3) continue;
        out.push({ ...p, yaw: (p.x * 7.3 + p.z * 3.1) % (Math.PI * 2) });
      }
    }
  }
  return out;
}

/** Bancos al costado de los senderos cada `spacing` m, mirando hacia el camino. */
export function benchPositions(paths: readonly { points: readonly Vec2[]; width: number }[], spacing: number): Placement[] {
  const out: Placement[] = [];
  for (const path of paths) {
    let carry = spacing / 2;
    for (let i = 0; i < path.points.length - 1; i++) {
      const a = path.points[i]!;
      const b = path.points[i + 1]!;
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len < 1e-3) continue;
      const t = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
      const n = { x: -t.z, z: t.x };
      const off = path.width / 2 + 0.9;
      for (let d = carry; d < len; d += spacing) {
        out.push({ x: a.x + t.x * d + n.x * off, z: a.z + t.z * d + n.z * off, yaw: Math.atan2(-n.x, -n.z) });
      }
      carry = (((carry - len) % spacing) + spacing) % spacing;
    }
  }
  return out;
}
