import type { Vec2 } from './types';
import { polygonArea } from './polygon';

/** Rectángulo orientado de área mínima (por direcciones de aristas). */
export interface OrientedBox {
  readonly center: Vec2;
  /** Eje largo (unitario). */
  readonly u: Vec2;
  /** Eje corto (unitario, perpendicular). */
  readonly v: Vec2;
  readonly halfU: number;
  readonly halfV: number;
  /** área del polígono / área del OBB ∈ (0,1]. */
  readonly rectangularity: number;
}

export function orientedBox(poly: readonly Vec2[]): OrientedBox {
  let best: OrientedBox | null = null;
  let bestArea = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 1e-6) continue;
    const ax = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
    const ay = { x: -ax.z, z: ax.x };
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const p of poly) {
      const pu = p.x * ax.x + p.z * ax.z;
      const pv = p.x * ay.x + p.z * ay.z;
      minU = Math.min(minU, pu); maxU = Math.max(maxU, pu);
      minV = Math.min(minV, pv); maxV = Math.max(maxV, pv);
    }
    const area = (maxU - minU) * (maxV - minV);
    if (area < bestArea) {
      bestArea = area;
      const cu = (minU + maxU) / 2;
      const cv = (minV + maxV) / 2;
      const center = { x: ax.x * cu + ay.x * cv, z: ax.z * cu + ay.z * cv };
      const hu = (maxU - minU) / 2;
      const hv = (maxV - minV) / 2;
      best = hu >= hv
        ? { center, u: ax, v: ay, halfU: hu, halfV: hv, rectangularity: 0 }
        : { center, u: ay, v: { x: -ax.x, z: -ax.z }, halfU: hv, halfV: hu, rectangularity: 0 };
    }
  }
  if (!best) throw new Error('Polígono degenerado');
  return { ...best, rectangularity: polygonArea(poly) / bestArea };
}
