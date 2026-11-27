import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { straightSkeleton, type Skeleton } from '@shared/geo/straightSkeleton';
import { ensureCCW, polygonArea, signedArea } from '@shared/geo/polygon';
import type { Vec2 } from '@shared/geo/types';

/** Área proyectada de todas las caras (deben teselar el footprint). */
function facesArea(sk: Skeleton): number {
  return sk.faces.reduce((s, f) => s + polygonArea(f.nodes.map((i) => sk.nodes[i]!)), 0);
}

/** Cada nodo de una cara está a distancia `t` de la línea de su arista (caras planas). */
function maxPlanarityError(poly: readonly Vec2[], sk: Skeleton): number {
  let err = 0;
  for (const f of sk.faces) {
    const a = poly[f.edge]!;
    const b = poly[(f.edge + 1) % poly.length]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    for (const id of f.nodes) {
      const p = sk.nodes[id]!;
      // Distancia hacia el interior (izquierda en vista de mapa, Norte = −z).
      const d = ((b.x - a.x) * (-(p.z - a.z)) - (-(b.z - a.z)) * (p.x - a.x)) / len;
      err = Math.max(err, Math.abs(d - p.t));
    }
  }
  return err;
}

const rect = (w: number, h: number): Vec2[] => ensureCCW([{ x: 0, z: 0 }, { x: w, z: 0 }, { x: w, z: h }, { x: 0, z: h }]);

describe('straightSkeleton (ROOF-1)', () => {
  it('ROOF-1: rectángulo → 2 triángulos + 2 trapecios, cumbrera L − W a altura W/2', () => {
    const poly = rect(20, 8);
    const sk = straightSkeleton(poly)!;
    expect(sk).not.toBeNull();
    const sizes = sk.faces.map((f) => f.nodes.length).sort();
    expect(sizes).toEqual([3, 3, 4, 4]);
    const inner = sk.nodes.filter((p) => p.t > 0);
    expect(inner).toHaveLength(2);
    for (const p of inner) expect(p.t).toBeCloseTo(4, 6);
    expect(Math.abs(inner[0]!.x - inner[1]!.x)).toBeCloseTo(12, 6);
    expect(facesArea(sk)).toBeCloseTo(160, 6);
  });

  it('ROOF-1: cuadrado → pirámide (un único nodo interior)', () => {
    const sk = straightSkeleton(rect(10, 10))!;
    expect(sk.nodes.filter((p) => p.t > 0)).toHaveLength(1);
    expect(sk.faces.every((f) => f.nodes.length === 3)).toBe(true);
  });

  it('ROOF-1: planta en L (vértice reflejo) → 6 caras planas que cubren el footprint', () => {
    const poly = ensureCCW([{ x: 0, z: 0 }, { x: 30, z: 0 }, { x: 30, z: 10 }, { x: 10, z: 10 }, { x: 10, z: 25 }, { x: 0, z: 25 }]);
    const sk = straightSkeleton(poly)!;
    expect(sk.faces).toHaveLength(6);
    expect(facesArea(sk)).toBeCloseTo(polygonArea(poly), 4);
    expect(maxPlanarityError(poly, sk)).toBeLessThan(1e-6);
  });

  it('ROOF-1: plantas en T, U y cruz, incluso con eventos simultáneos', () => {
    const T = ensureCCW([{ x: 0, z: 0 }, { x: 30, z: 0 }, { x: 30, z: 9 }, { x: 19, z: 9 }, { x: 19, z: 25 }, { x: 12, z: 25 }, { x: 12, z: 9 }, { x: 0, z: 9 }]);
    const U = ensureCCW([{ x: 0, z: 0 }, { x: 30, z: 0 }, { x: 30, z: 20 }, { x: 22, z: 20 }, { x: 22, z: 8 }, { x: 8, z: 8 }, { x: 8, z: 20 }, { x: 0, z: 20 }]);
    const T8 = ensureCCW([{ x: 0, z: 0 }, { x: 30, z: 0 }, { x: 30, z: 8 }, { x: 19, z: 8 }, { x: 19, z: 25 }, { x: 11, z: 25 }, { x: 11, z: 8 }, { x: 0, z: 8 }]);
    const cross = ensureCCW([{ x: 8, z: 0 }, { x: 16, z: 0 }, { x: 16, z: 8 }, { x: 24, z: 8 }, { x: 24, z: 16 }, { x: 16, z: 16 }, { x: 16, z: 24 }, { x: 8, z: 24 }, { x: 8, z: 16 }, { x: 0, z: 16 }, { x: 0, z: 8 }, { x: 8, z: 8 }]);
    for (const poly of [T, U, T8, cross]) {
      const sk = straightSkeleton(poly)!;
      expect(sk).not.toBeNull();
      expect(facesArea(sk)).toBeCloseTo(polygonArea(poly), 4);
      expect(maxPlanarityError(poly, sk)).toBeLessThan(1e-6);
    }
  });

  it('ROOF-1: las caras están en orden CCW (normales hacia arriba)', () => {
    const poly = ensureCCW([{ x: 0, z: 0 }, { x: 30, z: 0 }, { x: 30, z: 10 }, { x: 10, z: 10 }, { x: 10, z: 25 }, { x: 0, z: 25 }]);
    const sk = straightSkeleton(poly)!;
    for (const f of sk.faces) expect(signedArea(f.nodes.map((i) => sk.nodes[i]!))).toBeGreaterThan(0);
  });

  it('ROOF-1: polígonos estrellados aleatorios (semilla fija) cumplen los invariantes', () => {
    let s = 12345;
    const rnd = (): number => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let k = 0; k < 40; k++) {
      const m = 5 + Math.floor(rnd() * 10);
      const poly = ensureCCW(Array.from({ length: m }, (_, i) => {
        const a = (i / m) * Math.PI * 2;
        const r = 8 + rnd() * 12;
        return { x: Math.cos(a) * r, z: Math.sin(a) * r };
      }));
      const sk = straightSkeleton(poly);
      expect(sk, `polígono ${k}`).not.toBeNull();
      expect(facesArea(sk!)).toBeCloseTo(polygonArea(poly), 3);
      expect(maxPlanarityError(poly, sk!)).toBeLessThan(1e-5);
    }
  });

  it('ROOF-1: todos los footprints reales del campus tienen skeleton válido', () => {
    const world = JSON.parse(readFileSync('data/world.json', 'utf8')) as { buildings: { id: string; footprint: Vec2[] }[] };
    for (const b of world.buildings) {
      const sk = straightSkeleton(b.footprint);
      expect(sk, b.id).not.toBeNull();
      expect(facesArea(sk!) / polygonArea(b.footprint), b.id).toBeCloseTo(1, 3);
      expect(maxPlanarityError(b.footprint, sk!), b.id).toBeLessThan(1e-4);
    }
  });
});
