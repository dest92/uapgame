import type { Vec2 } from '@shared/geo/types';
import { pushVertex, type GeometryData } from '../geometry/GeometryData';

type RGB = readonly [number, number, number];
type V3 = [number, number, number];

/**
 * Sistema local de una pared: u a lo largo de la arista, y absoluta, w hacia afuera
 * (w < 0 = dentro del muro). Todas las piezas del kit se ubican en este marco.
 */
export interface WallFrame {
  readonly a: Vec2;
  /** Dirección unitaria de la arista. */
  readonly d: Vec2;
  /** Normal exterior unitaria. */
  readonly n: Vec2;
  readonly length: number;
}

export function wallFrame(a: Vec2, b: Vec2): WallFrame {
  const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const d = { x: (b.x - a.x) / length, z: (b.z - a.z) / length };
  return { a, d, n: { x: -d.z, z: d.x }, length };
}

export const toWorld = (f: WallFrame, u: number, y: number, w: number): V3 =>
  [f.a.x + f.d.x * u + f.n.x * w, y, f.a.z + f.d.z * u + f.n.z * w];

const dirWorld = (f: WallFrame, du: number, dy: number, dw: number): V3 =>
  [f.d.x * du + f.n.x * dw, dy, f.d.z * du + f.n.z * dw];

export interface QuadOpts {
  readonly color: RGB;
  readonly extra?: readonly [number, number, number];
  /** AO horneado: multiplicador de color por esquina (1 = sin oclusión). */
  readonly shade?: readonly number[];
}

/**
 * Quad plano por 4 esquinas en el marco (orden CCW visto desde la normal) con UV métricas
 * proyectadas sobre el eje dominante del plano.
 */
export function quad(g: GeometryData, f: WallFrame, c: readonly (readonly [number, number, number])[], normal: readonly [number, number, number], o: QuadOpts, uvs?: readonly (readonly [number, number])[]): void {
  const n = dirWorld(f, normal[0], normal[1], normal[2]);
  const base = g.positions.length / 3;
  c.forEach(([u, y, w], i) => {
    const uv: readonly [number, number] = uvs?.[i] ?? (Math.abs(normal[1]) > 0.5 ? [u, w] : Math.abs(normal[0]) > 0.5 ? [w, y] : [u, y]);
    const k = o.shade?.[i] ?? 1;
    const color: readonly [number, number, number] = k === 1 ? o.color : [o.color[0] * k, o.color[1] * k, o.color[2] * k];
    pushVertex(g, { p: toWorld(f, u, y, w), n, uv, color, ...(o.extra ? { extra: o.extra } : {}) });
  });
  g.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

/** Caja alineada al marco [u0,u1]×[y0,y1]×[w0,w1]. `skip` omite caras ocultas. */
export function box(
  g: GeometryData, f: WallFrame, u0: number, u1: number, y0: number, y1: number, w0: number, w1: number, o: QuadOpts,
  skip: { back?: boolean; bottom?: boolean; top?: boolean } = {},
): void {
  // Frente (w1), mirando +w.
  quad(g, f, [[u0, y0, w1], [u1, y0, w1], [u1, y1, w1], [u0, y1, w1]], [0, 0, 1], o);
  if (!skip.back) quad(g, f, [[u1, y0, w0], [u0, y0, w0], [u0, y1, w0], [u1, y1, w0]], [0, 0, -1], o);
  if (!skip.top) quad(g, f, [[u0, y1, w1], [u1, y1, w1], [u1, y1, w0], [u0, y1, w0]], [0, 1, 0], o);
  if (!skip.bottom) quad(g, f, [[u0, y0, w0], [u1, y0, w0], [u1, y0, w1], [u0, y0, w1]], [0, -1, 0], o);
  quad(g, f, [[u0, y0, w0], [u0, y0, w1], [u0, y1, w1], [u0, y1, w0]], [-1, 0, 0], o);
  quad(g, f, [[u1, y0, w1], [u1, y0, w0], [u1, y1, w0], [u1, y1, w1]], [1, 0, 0], o);
}

/** Vértice convexo (visto desde afuera) entre la arista entrante a→b y la saliente b→c. */
export function isConvex(a: Vec2, b: Vec2, c: Vec2): boolean {
  // CCW en vista de mapa (Norte = −z): giro a la izquierda ⇒ convexo.
  const cross = (b.x - a.x) * -(c.z - b.z) - -(b.z - a.z) * (c.x - b.x);
  return cross > 0;
}
