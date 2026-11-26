import type { Vec2 } from '@shared/geo/types';
import type { HeightGrid } from '@shared/terrain/heightField';
import { ensureCCW } from '@shared/geo/polygon';

export interface TriMeshData {
  readonly vertices: Float32Array;
  readonly indices: Uint32Array;
}

/** Fan-triangulación por "ear clipping" mínima (sin dependencias de render). */
function triangulate(poly: readonly Vec2[]): number[] {
  const idx = poly.map((_, i) => i);
  const out: number[] = [];
  const area = (a: Vec2, b: Vec2, c: Vec2): number => (b.x - a.x) * -(c.z - a.z) - -(b.z - a.z) * (c.x - a.x);
  const inside = (p: Vec2, a: Vec2, b: Vec2, c: Vec2): boolean =>
    area(a, b, p) >= 0 && area(b, c, p) >= 0 && area(c, a, p) >= 0;
  let guard = 0;
  while (idx.length > 3 && guard++ < 10000) {
    let clipped = false;
    for (let i = 0; i < idx.length; i++) {
      const [ia, ib, ic] = [idx[(i + idx.length - 1) % idx.length]!, idx[i]!, idx[(i + 1) % idx.length]!];
      const [a, b, c] = [poly[ia]!, poly[ib]!, poly[ic]!];
      if (area(a, b, c) <= 0) continue;
      if (idx.some((k) => k !== ia && k !== ib && k !== ic && inside(poly[k]!, a, b, c))) continue;
      out.push(ia, ib, ic);
      idx.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) out.push(idx[0]!, idx[1]!, idx[2]!);
  return out;
}

/** Prisma cerrado (paredes + tapas) a partir de un footprint, para colisión de edificios. */
export function footprintPrism(footprint: readonly Vec2[], y0: number, y1: number): TriMeshData {
  const poly = ensureCCW(footprint);
  const n = poly.length;
  const vertices = new Float32Array(n * 2 * 3);
  poly.forEach((p, i) => {
    vertices.set([p.x, y0, p.z], i * 3);
    vertices.set([p.x, y1, p.z], (n + i) * 3);
  });
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    indices.push(i, j, n + j, i, n + j, n + i);
  }
  const cap = triangulate(poly);
  for (let k = 0; k < cap.length; k += 3) {
    indices.push(n + cap[k]!, n + cap[k + 1]!, n + cap[k + 2]!);
    indices.push(cap[k]!, cap[k + 2]!, cap[k + 1]!);
  }
  return { vertices, indices: new Uint32Array(indices) };
}

/** Trimesh de la grilla de terreno (misma fuente de verdad que el render). */
export function gridTrimesh(g: HeightGrid): TriMeshData {
  const vertices = new Float32Array(g.cols * g.rows * 3);
  for (let r = 0; r < g.rows; r++)
    for (let c = 0; c < g.cols; c++) {
      const i = r * g.cols + c;
      vertices.set([g.originX + c * g.cellSize, g.heights[i] ?? 0, g.originZ + r * g.cellSize], i * 3);
    }
  const indices: number[] = [];
  for (let r = 0; r < g.rows - 1; r++)
    for (let c = 0; c < g.cols - 1; c++) {
      const a = r * g.cols + c;
      indices.push(a, a + g.cols, a + 1, a + 1, a + g.cols, a + g.cols + 1);
    }
  return { vertices, indices: new Uint32Array(indices) };
}
