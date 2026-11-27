import type { Vec2 } from '@shared/geo/types';
import { bboxOf, distanceToPolyline, pointInPolygon } from '@shared/geo/polygon';
import type { TreeSpecies } from '@shared/world/types';

export interface Corridor {
  readonly points: readonly Vec2[];
  readonly width: number;
}

export interface ScatterInput {
  /** Polígonos donde se rellena (parques, jardines, pasto). */
  readonly fillAreas: readonly (readonly Vec2[])[];
  /** Polígonos prohibidos (edificios, canchas, agua…). */
  readonly blockers: readonly (readonly Vec2[])[];
  /** Calles/senderos: se deja libre su ancho + margen. */
  readonly corridors: readonly Corridor[];
  /** Árboles de OSM que se respetan tal cual (VEG-2). */
  readonly fixed: readonly Vec2[];
  readonly spacing: number;
  readonly seed: number;
}

export interface PlacedTree {
  readonly position: Vec2;
  readonly species: TreeSpecies;
  /** Escala 0.8..1.25 determinista. */
  readonly scale: number;
  readonly source: 'osm' | 'procedural';
}

export const MIN_TREE_DISTANCE = 4;

/** PRNG determinista (VEG-1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash2 = (p: Vec2): number => {
  const h = Math.sin(p.x * 127.1 + p.z * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

/** VEG-3: mezcla típica de la zona (latifoliadas, coníferas, palmeras pindó). */
export function speciesAt(p: Vec2): TreeSpecies {
  const h = hash2(p);
  return h < 0.72 ? 'broadleaf' : h < 0.86 ? 'conifer' : 'palm';
}

/** Grilla espacial para consultas de vecinos en O(1). */
class SpatialGrid {
  private readonly cells = new Map<string, Vec2[]>();
  constructor(private readonly size: number) {}
  private key(x: number, z: number): string {
    return `${Math.floor(x / this.size)},${Math.floor(z / this.size)}`;
  }
  add(p: Vec2): void {
    const k = this.key(p.x, p.z);
    (this.cells.get(k) ?? this.cells.set(k, []).get(k)!).push(p);
  }
  near(p: Vec2, r: number): boolean {
    const cx = Math.floor(p.x / this.size);
    const cz = Math.floor(p.z / this.size);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        for (const q of this.cells.get(`${cx + dx},${cz + dz}`) ?? []) if (Math.hypot(q.x - p.x, q.z - p.z) < r) return true;
    return false;
  }
}

/**
 * Relleno con dart-throwing tipo Poisson-disk dentro de áreas verdes (VEG-1/2).
 * Determinista por semilla; respeta árboles fijos, edificios y corredores.
 */
export function scatterTrees(input: ScatterInput): PlacedTree[] {
  const rand = mulberry32(input.seed);
  const grid = new SpatialGrid(Math.max(input.spacing, MIN_TREE_DISTANCE));
  const out: PlacedTree[] = [];
  const place = (p: Vec2, source: PlacedTree['source']): void => {
    grid.add(p);
    out.push({ position: p, species: speciesAt(p), scale: 0.8 + hash2({ x: p.z, z: p.x }) * 0.45, source });
  };
  for (const p of input.fixed) place(p, 'osm');

  const blocked = (p: Vec2): boolean =>
    input.blockers.some((b) => pointInPolygon(p, b)) ||
    input.corridors.some((c) => distanceToPolyline(p, c.points) < c.width / 2 + 2);

  for (const area of input.fillAreas) {
    const bb = bboxOf(area);
    const attempts = Math.ceil(((bb.maxX - bb.minX) * (bb.maxZ - bb.minZ)) / (input.spacing * input.spacing)) * 4;
    for (let i = 0; i < attempts; i++) {
      const p = { x: bb.minX + rand() * (bb.maxX - bb.minX), z: bb.minZ + rand() * (bb.maxZ - bb.minZ) };
      if (!pointInPolygon(p, area) || grid.near(p, input.spacing) || blocked(p)) continue;
      place(p, 'procedural');
    }
  }
  return out;
}

/** Arbolado de vereda: puntos a ambos lados de las calles cada `step` metros. */
export function streetTreePoints(corridors: readonly Corridor[], step: number, setback: number): Vec2[] {
  const pts: Vec2[] = [];
  for (const c of corridors) {
    let carry = step / 2;
    for (let i = 0; i < c.points.length - 1; i++) {
      const a = c.points[i]!;
      const b = c.points[i + 1]!;
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len < 1e-6) continue;
      const t = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
      const n = { x: -t.z, z: t.x };
      for (let d = carry; d < len; d += step) {
        const off = c.width / 2 + setback;
        for (const s of [1, -1]) pts.push({ x: a.x + t.x * d + n.x * off * s, z: a.z + t.z * d + n.z * off * s });
      }
      carry = (carry - len) % step;
      if (carry < 0) carry += step;
    }
  }
  return pts;
}
