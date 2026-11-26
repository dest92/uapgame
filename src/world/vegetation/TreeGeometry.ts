import { mulberry32 } from '../../domain/vegetation/scatter';
import type { TreeSpecies } from '@shared/world/types';
import { emptyGeometry, pushVertex, type GeometryData } from '../geometry/GeometryData';

export interface TreeParts {
  readonly trunk: GeometryData;
  readonly foliage: GeometryData;
  /** Altura total aproximada (para el viento y el LOD). */
  readonly height: number;
}

type V3 = [number, number, number];

/** Tronco cónico (cilindro con `seg` lados) de a→b. UV en metros para corteza. */
function trunk(g: GeometryData, base: V3, top: V3, r0: number, r1: number, seg: number): void {
  const start = g.positions.length / 3;
  const len = Math.hypot(top[0] - base[0], top[1] - base[1], top[2] - base[2]);
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const cx = Math.cos(a);
    const sz = Math.sin(a);
    pushVertex(g, { p: [base[0] + cx * r0, base[1], base[2] + sz * r0], n: [cx, 0, sz], uv: [(i / seg) * 2 * Math.PI * r0, 0], color: [1, 1, 1] });
    pushVertex(g, { p: [top[0] + cx * r1, top[1], top[2] + sz * r1], n: [cx, 0, sz], uv: [(i / seg) * 2 * Math.PI * r0, len], color: [1, 1, 1] });
  }
  for (let i = 0; i < seg; i++) {
    const a = start + i * 2;
    g.indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
  }
}

/**
 * Racimo de follaje: 3 tarjetas cruzadas centradas en `c`. Las normales apuntan
 * desde el centro de la copa (iluminación "esférica" suave, técnica estándar).
 */
function cluster(g: GeometryData, c: V3, size: number, canopy: V3, tint: V3, rand: () => number): void {
  const rot = rand() * Math.PI;
  for (let k = 0; k < 3; k++) {
    // Dos tarjetas verticales cruzadas + una horizontal.
    const a = rot + (k * Math.PI) / 2;
    const ax: V3 = [Math.cos(a), 0, Math.sin(a)];
    const up: V3 = k < 2 ? [0, 1, 0] : [-Math.sin(a), 0, Math.cos(a)];
    const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const base = g.positions.length / 3;
    for (const [sx, sy] of corners) {
      const p: V3 = [c[0] + (ax[0] * sx + up[0] * sy) * size, c[1] + (ax[1] * sx + up[1] * sy) * size, c[2] + (ax[2] * sx + up[2] * sy) * size];
      const n: V3 = [p[0] - canopy[0], (p[1] - canopy[1]) * 0.8 + 0.4, p[2] - canopy[2]];
      const l = Math.hypot(...n) || 1;
      pushVertex(g, { p, n: [n[0] / l, n[1] / l, n[2] / l], uv: [(sx + 1) / 2, (sy + 1) / 2], color: tint });
    }
    g.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

const TINTS: readonly V3[] = [[1, 1, 1], [0.86, 0.95, 0.8], [1.08, 1.05, 0.88], [0.92, 0.9, 0.86]];

/** Genera una variante de árbol por especie y nivel de detalle (2 LODs). */
export function buildTree(species: TreeSpecies, lod: 0 | 1, variant = 0): TreeParts {
  const rand = mulberry32(17 + variant * 131 + (species === 'conifer' ? 7 : species === 'palm' ? 13 : 0));
  const t = emptyGeometry();
  const f = emptyGeometry();
  const tint = (): V3 => TINTS[Math.floor(rand() * TINTS.length)]!;
  const seg = lod === 0 ? 7 : 4;

  if (species === 'palm') {
    const h = 7 + rand() * 2;
    const lean = (rand() - 0.5) * 0.8;
    trunk(t, [0, -0.3, 0], [lean, h, 0], 0.24, 0.18, seg);
    const fronds = lod === 0 ? 14 : 8;
    for (let i = 0; i < fronds; i++) {
      const a = (i / fronds) * Math.PI * 2 + rand() * 0.3;
      const len = 3 + rand() * 1.2;
      const droop = 0.4 + rand() * 0.6;
      const base = f.positions.length / 3;
      const dir: V3 = [Math.cos(a), 0, Math.sin(a)];
      const side: V3 = [-dir[2], 0, dir[0]];
      const steps = lod === 0 ? 5 : 2;
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const y = h + Math.sin(u * Math.PI * 0.9) * 0.9 - u * u * droop * 2;
        const cx = lean + dir[0] * len * u;
        const cz = dir[2] * len * u;
        const w = 0.55 * Math.sin(Math.max(0.15, u) * Math.PI);
        const n: V3 = [dir[0] * 0.3, 1, dir[2] * 0.3];
        for (const sgn of [-1, 1]) pushVertex(f, { p: [cx + side[0] * w * sgn, y, cz + side[2] * w * sgn], n, uv: [(sgn + 1) / 2, 1 - u], color: tint() });
      }
      for (let s = 0; s < steps; s++) {
        const k = base + s * 2;
        f.indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    return { trunk: t, foliage: f, height: h + 1 };
  }

  if (species === 'conifer') {
    const h = 9 + rand() * 4;
    trunk(t, [0, -0.3, 0], [0, h * 0.95, 0], 0.28, 0.06, seg);
    const layers = lod === 0 ? 9 : 4;
    const canopy: V3 = [0, h * 0.55, 0];
    for (let i = 0; i < layers; i++) {
      const u = i / (layers - 1);
      const y = h * (0.22 + u * 0.75);
      const r = (1 - u) * 2.4 + 0.4;
      const per = lod === 0 ? Math.max(2, Math.round(r * 2.2)) : 2;
      for (let k = 0; k < per; k++) {
        const a = (k / per) * Math.PI * 2 + rand();
        cluster(f, [Math.cos(a) * r * 0.55, y, Math.sin(a) * r * 0.55], r * 0.75 + 0.3, canopy, tint(), rand);
      }
    }
    return { trunk: t, foliage: f, height: h };
  }

  // Latifoliada (tipa/paraíso/fresno): tronco + ramas + copa ovoide de racimos.
  const h = 7 + rand() * 3;
  const crownY = h * 0.62;
  trunk(t, [0, -0.3, 0], [0.1, h * 0.45, 0], 0.32, 0.2, seg);
  const branches = lod === 0 ? 5 : 3;
  for (let i = 0; i < branches; i++) {
    const a = (i / branches) * Math.PI * 2 + rand();
    trunk(t, [0.1, h * 0.42, 0], [Math.cos(a) * 1.8, crownY + rand() * 1.2, Math.sin(a) * 1.8], 0.14, 0.05, 4);
  }
  const canopy: V3 = [0, crownY, 0];
  const n = lod === 0 ? 26 : 9;
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    const y = crownY + (rand() - 0.35) * h * 0.42;
    cluster(f, [Math.cos(a) * r * 3.1, y, Math.sin(a) * r * 3.1], 1.5 + rand() * 0.8 + (lod ? 0.6 : 0), canopy, tint(), rand);
  }
  return { trunk: t, foliage: f, height: h };
}
