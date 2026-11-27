/**
 * Matemática pura para ubicar piezas de un hero asset sobre el footprint de OSM
 * (X = Este, Z = Sur, metros). Sin dependencias de motor: testeable.
 */
import type { Vec2 } from '@shared/geo/types';

/**
 * Marco local de una pieza: origen sobre el suelo, `tangent` = +X local, `normal` = +Z local (hacia afuera).
 * Invariante (mano derecha con +Y arriba): normal = (−tangent.z, tangent.x).
 */
export interface Frame2 {
  readonly origin: Vec2;
  readonly tangent: Vec2;
  readonly normal: Vec2;
}

export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, z: a.z - b.z });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, z: a.z + b.z });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, z: a.z * s });
export const len = (a: Vec2): number => Math.hypot(a.x, a.z);
export const norm = (a: Vec2): Vec2 => {
  const l = len(a) || 1;
  return { x: a.x / l, z: a.z / l };
};
export const lerp2 = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });

/** Traslada un polígono para que `origin` quede en (0, 0). */
export const relativeTo = (poly: readonly Vec2[], origin: Vec2): Vec2[] => poly.map((p) => sub(p, origin));

/** Círculo por mínimos cuadrados (método algebraico de Kåsa). */
export function fitCircle(pts: readonly Vec2[]): { center: Vec2; radius: number } {
  const n = pts.length;
  if (n < 3) throw new Error('fitCircle: se necesitan ≥ 3 puntos');
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const mz = pts.reduce((s, p) => s + p.z, 0) / n;
  let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
  for (const p of pts) {
    const u = p.x - mx;
    const v = p.z - mz;
    suu += u * u; svv += v * v; suv += u * v;
    suuu += u * u * u; svvv += v * v * v; suvv += u * v * v; svuu += v * u * u;
  }
  const det = suu * svv - suv * suv;
  if (Math.abs(det) < 1e-12) throw new Error('fitCircle: puntos colineales');
  const b1 = (suuu + suvv) / 2;
  const b2 = (svvv + svuu) / 2;
  const uc = (b1 * svv - b2 * suv) / det;
  const vc = (b2 * suu - b1 * suv) / det;
  return { center: { x: uc + mx, z: vc + mz }, radius: Math.sqrt(uc * uc + vc * vc + (suu + svv) / n) };
}

/**
 * Marcos a lo largo de un arco de circunferencia, de izquierda a derecha vistos desde afuera.
 * `aLeft` = ángulo (radianes, en X-Z desde +X hacia +Z) del extremo izquierdo. Cada pieza i ocupa
 * `widths[i]` metros de arco; el marco queda en su centro con la normal radial hacia afuera.
 */
export function framesAlongArc(center: Vec2, radius: number, aLeft: number, widths: readonly number[]): Frame2[] {
  const frames: Frame2[] = [];
  let s = 0;
  for (const w of widths) {
    // Visto desde afuera, la derecha (+X local) es el sentido de ángulo decreciente.
    const a = aLeft - (s + w / 2) / radius;
    const normal = { x: Math.cos(a), z: Math.sin(a) };
    frames.push({ origin: add(center, scale(normal, radius)), normal, tangent: { x: normal.z, z: -normal.x } });
    s += w;
  }
  return frames;
}

export const angleOf = (center: Vec2, p: Vec2): number => Math.atan2(p.z - center.z, p.x - center.x);

/**
 * Marco sobre la arista a→b de un polígono CCW en vista de mapa (Norte = −Z): la normal exterior
 * queda a la derecha del recorrido visto en el mapa. `t` ∈ [0, 1] ubica el origen sobre la arista.
 */
export function edgeFrame(a: Vec2, b: Vec2, t = 0): Frame2 {
  const tangent = norm(sub(b, a));
  return { origin: lerp2(a, b, t), tangent, normal: { x: -tangent.z, z: tangent.x } };
}

/** Lleva un punto del marco local (x sobre la tangente, z sobre la normal) al plano X-Z. */
export const toWorld = (f: Frame2, x: number, z: number): Vec2 => ({
  x: f.origin.x + f.tangent.x * x + f.normal.x * z,
  z: f.origin.z + f.tangent.z * x + f.normal.z * z,
});

/** Ángulo de rotación alrededor de +Y que lleva +X local a `tangent` (convención three.js). */
export const yawOf = (f: Frame2): number => Math.atan2(-f.tangent.z, f.tangent.x);

/**
 * Desplaza un polígono hacia adentro `d` metros (aristas paralelas, unión en bisectriz).
 * Válido para retiros chicos frente al tamaño de las aristas (parapetos, cornisas).
 */
export function insetPolygon(poly: readonly Vec2[], d: number, ccwMap: boolean): Vec2[] {
  const n = poly.length;
  // CCW en mapa (Norte = −Z): el exterior es (−t.z, t.x) en X-Z, el interior el opuesto.
  const inward = (t: Vec2): Vec2 => (ccwMap ? { x: t.z, z: -t.x } : { x: -t.z, z: t.x });
  return poly.map((p, i) => {
    const prev = poly[(i - 1 + n) % n]!;
    const next = poly[(i + 1) % n]!;
    const n1 = inward(norm(sub(p, prev)));
    const n2 = inward(norm(sub(next, p)));
    const bis = norm(add(n1, n2));
    const cos = bis.x * n1.x + bis.z * n1.z;
    const k = d / Math.max(cos, 0.35);
    return add(p, scale(bis, k));
  });
}
