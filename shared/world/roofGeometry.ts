import type { Vec2 } from '../geo/types';
import { centroid } from '../geo/polygon';
import { orientedBox } from '../geo/obb';
import { straightSkeleton, type Skeleton } from '../geo/straightSkeleton';
import type { RoofShape } from './buildingRules';

/** Punto 3D (x, y relativo al tope de muros, z). */
export type P3 = readonly [number, number, number];

export interface RoofMesh {
  /** Faldones (polígonos planos, CCW visto desde arriba, normal con +Y). */
  readonly faces: readonly (readonly P3[])[];
  /** Hastiales: polígonos verticales de muro por encima del tope de muros. */
  readonly gables: readonly (readonly P3[])[];
  /** Bordes libres (alero y canto de hastial) para la cenefa: pares de puntos. */
  readonly trim: readonly (readonly [P3, P3])[];
  /** Altura de la cumbrera sobre el tope de muros. */
  readonly height: number;
}

export interface RoofOptions {
  /** Pendiente deseada (grados); se reduce si la cumbrera superaría `maxHeight`. */
  readonly pitchDeg: number;
  readonly maxHeight: number;
  /** Vuelo del alero (m, horizontal). */
  readonly eave: number;
}

const MITER_LIMIT = 2.5;

/** Normal exterior de la arista a→b de un polígono CCW en vista de mapa (Norte = −z). */
export function outNormal(a: Vec2, b: Vec2): Vec2 {
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return { x: -(b.z - a.z) / len, z: (b.x - a.x) / len };
}

/** Desplazamiento hacia afuera (unitario por arista) en el vértice i, como bisectriz con límite. */
function miter(fp: readonly Vec2[], i: number): Vec2 {
  const n = fp.length;
  const prev = fp[(i + n - 1) % n]!;
  const p = fp[i]!;
  const next = fp[(i + 1) % n]!;
  const n1 = outNormal(prev, p);
  const n2 = outNormal(p, next);
  const bx = n1.x + n2.x;
  const bz = n1.z + n2.z;
  const bl = Math.hypot(bx, bz);
  if (bl < 1e-6) return n1;
  const cos = Math.max(1 / MITER_LIMIT, (bx / bl) * n1.x + (bz / bl) * n1.z);
  return { x: (bx / bl) / cos, z: (bz / bl) / cos };
}

/** Normal exterior horizontal de la arista i. */
const edgeOut = (fp: readonly Vec2[], i: number): Vec2 => outNormal(fp[i]!, fp[(i + 1) % fp.length]!);

const r2 = (v: number): number => Math.round(v * 100) / 100;
const pt = (x: number, y: number, z: number): P3 => [r2(x), r2(y), r2(z)];

/** Techo a 4 aguas (o a 2 aguas con hastiales) sobre cualquier footprint, por straight skeleton. */
function skeletonRoof(fp: readonly Vec2[], sk: Skeleton, gabled: boolean, o: RoofOptions): RoofMesh {
  const n = fp.length;
  /** Distancia hacia adentro de p a la línea de la arista k (= t en el plano de su faldón). */
  const inward = (k: number, p: Vec2): number => {
    const a = fp[k]!;
    const o2 = edgeOut(fp, k);
    return -((p.x - a.x) * o2.x + (p.z - a.z) * o2.z);
  };
  // Hastiales: caras triangulares cuyo vértice superior es compartido solo con sus 2 vecinas.
  // El vértice se desliza por la cumbrera (intersección de los faldones vecinos, así siguen
  // planos) hasta el plano vertical del muro (y hasta el alero para el faldón).
  const moved = new Map<number, { wall: Vec2; roof: Vec2; t: number; edge: number }>();
  if (gabled) {
    const facesOf = new Map<number, number[]>();
    for (const f of sk.faces) for (const id of f.nodes) facesOf.set(id, [...(facesOf.get(id) ?? []), f.edge]);
    for (const f of sk.faces) {
      if (f.nodes.length !== 3) continue;
      const apex = f.nodes[2]!;
      const around = facesOf.get(apex)!;
      if (around.length !== 3 || moved.has(apex)) continue;
      const [ea, eb] = around.filter((e) => e !== f.edge) as [number, number];
      const na = edgeOut(fp, ea);
      const nb = edgeOut(fp, eb);
      // t_a(p) = t_b(p) ⇔ (nb − na)·p = cte: dirección de la cumbrera ⟂ (nb − na).
      const dx = nb.x - na.x;
      const dz = nb.z - na.z;
      const dl = Math.hypot(dx, dz);
      if (dl < 1e-6) continue;
      const dir = { x: -dz / dl, z: dx / dl };
      const P0 = { x: sk.nodes[apex]!.x, z: sk.nodes[apex]!.z };
      const rate = inward(f.edge, { x: P0.x + dir.x, z: P0.z + dir.z }) - inward(f.edge, P0);
      if (Math.abs(rate) < 0.3) continue;
      const at = (target: number): Vec2 => {
        const s = (target - inward(f.edge, P0)) / rate;
        return { x: P0.x + dir.x * s, z: P0.z + dir.z * s };
      };
      const wall = at(0);
      const a = fp[f.edge]!;
      const b = fp[(f.edge + 1) % n]!;
      const len2 = (b.x - a.x) ** 2 + (b.z - a.z) ** 2;
      const u = ((wall.x - a.x) * (b.x - a.x) + (wall.z - a.z) * (b.z - a.z)) / len2;
      const t = inward(ea, wall);
      if (u < 0.1 || u > 0.9 || t < sk.nodes[apex]!.t - 1e-6) continue;
      moved.set(apex, { wall, roof: at(-o.eave), t, edge: f.edge });
    }
  }
  const tOf = (id: number): number => moved.get(id)?.t ?? sk.nodes[id]!.t;
  const maxT = Math.max(...sk.nodes.map((_, i) => tOf(i)), 1e-3);
  const slope = Math.min(Math.tan((o.pitchDeg * Math.PI) / 180), o.maxHeight / maxT);
  /** Posición del nodo en el faldón (con alero). */
  const roofPos = (id: number): P3 => {
    if (id < n) {
      const m = miter(fp, id);
      return pt(fp[id]!.x + m.x * o.eave, -o.eave * slope, fp[id]!.z + m.z * o.eave);
    }
    const q = moved.get(id)?.roof ?? sk.nodes[id]!;
    return pt(q.x, tOf(id) * slope, q.z);
  };
  const wallPos = (id: number): P3 => {
    if (id < n) return pt(fp[id]!.x, 0, fp[id]!.z);
    const q = moved.get(id)?.wall ?? sk.nodes[id]!;
    return pt(q.x, tOf(id) * slope, q.z);
  };
  const isGable = (f: { edge: number; nodes: readonly number[] }): boolean =>
    f.nodes.length === 3 && moved.get(f.nodes[2]!)?.edge === f.edge;
  const faces: P3[][] = [];
  const gables: P3[][] = [];
  const trim: [P3, P3][] = [];
  for (const f of sk.faces) {
    if (isGable(f)) {
      gables.push(f.nodes.map(wallPos));
      const [a, b, c] = f.nodes.map(roofPos) as [P3, P3, P3];
      trim.push([a, c], [c, b]);
      continue;
    }
    faces.push(f.nodes.map(roofPos));
    trim.push([roofPos(f.nodes[0]!), roofPos(f.nodes[1]!)]);
  }
  return { faces, gables, trim, height: r2(maxT * slope) };
}

/** Techo piramidal: todas las caras al centroide. */
function pyramidRoof(fp: readonly Vec2[], o: RoofOptions): RoofMesh {
  const c = centroid(fp);
  const rMean = fp.reduce((s, p) => s + Math.hypot(p.x - c.x, p.z - c.z), 0) / fp.length;
  const h = Math.min(o.maxHeight, Math.tan((o.pitchDeg * Math.PI) / 180) * rMean);
  const drop = (o.eave * h) / Math.max(rMean, 1);
  const apex = pt(c.x, h, c.z);
  const base = fp.map((p, i) => {
    const m = miter(fp, i);
    return pt(p.x + m.x * o.eave, -drop, p.z + m.z * o.eave);
  });
  const faces = base.map((a, i) => [a, base[(i + 1) % base.length]!, apex]);
  const trim = base.map((a, i): [P3, P3] => [a, base[(i + 1) % base.length]!]);
  return { faces, gables: [], trim, height: r2(h) };
}

/** Bóveda de cañón sobre el rectángulo orientado (galpones, gimnasios, supermercados). */
function barrelRoof(fp: readonly Vec2[], o: RoofOptions): RoofMesh | null {
  const b = orientedBox(fp);
  if (b.rectangularity < 0.85) return null;
  const hv = b.halfV;
  const h = Math.min(o.maxHeight, hv * 0.35);
  const R = (hv * hv + h * h) / (2 * h);
  const SEG = 14;
  const prof: { x: number; y: number }[] = [];
  const w = hv + o.eave;
  for (let i = 0; i <= SEG; i++) {
    const x = -w + (2 * w * i) / SEG;
    prof.push({ x, y: Math.sqrt(Math.max(0, R * R - x * x)) - (R - h) });
  }
  const P = (u: number, x: number, y: number): P3 =>
    pt(b.center.x + b.u.x * u + b.v.x * x, y, b.center.z + b.u.z * u + b.v.z * x);
  const U = b.halfU + o.eave;
  const faces: P3[][] = [];
  for (let i = 0; i < SEG; i++) {
    const a = prof[i]!;
    const c = prof[i + 1]!;
    faces.push([P(-U, a.x, a.y), P(-U, c.x, c.y), P(U, c.x, c.y), P(U, a.x, a.y)]);
  }
  const wallProf = [{ x: -hv, y: 0 }, ...prof.filter((p) => Math.abs(p.x) < hv - 1e-6), { x: hv, y: 0 }];
  const gables = [-b.halfU, b.halfU].map((u) => wallProf.map((p) => P(u, p.x, p.y)));
  const trim: [P3, P3][] = [
    [P(-U, -w, prof[0]!.y), P(U, -w, prof[0]!.y)],
    [P(-U, w, prof[SEG]!.y), P(U, w, prof[SEG]!.y)],
  ];
  for (const u of [-U, U]) for (let i = 0; i < SEG; i++) trim.push([P(u, prof[i]!.x, prof[i]!.y), P(u, prof[i + 1]!.x, prof[i + 1]!.y)]);
  return { faces, gables, trim, height: r2(h) };
}

export function buildRoofMesh(footprint: readonly Vec2[], shape: RoofShape, o: RoofOptions): RoofMesh | null {
  if (shape === 'flat') return null;
  if (shape === 'pyramidal' || shape === 'dome') return pyramidRoof(footprint, o);
  if (shape === 'round') {
    const barrel = barrelRoof(footprint, o);
    if (barrel) return barrel;
  }
  const sk = straightSkeleton(footprint);
  if (!sk) return null;
  return skeletonRoof(footprint, sk, shape !== 'hipped', o);
}
