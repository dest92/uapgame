import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildRoofMesh, type P3 } from '@shared/world/roofGeometry';
import { ensureCCW, polygonArea } from '@shared/geo/polygon';
import type { Vec2 } from '@shared/geo/types';

const rect = (w: number, h: number): Vec2[] => ensureCCW([{ x: 0, z: 0 }, { x: w, z: 0 }, { x: w, z: h }, { x: 0, z: h }]);
const L = ensureCCW([{ x: 0, z: 0 }, { x: 30, z: 0 }, { x: 30, z: 10 }, { x: 10, z: 10 }, { x: 10, z: 25 }, { x: 0, z: 25 }]);
const opts = { pitchDeg: 30, maxHeight: 6, eave: 0.5 };

/** Normal de Newell (sin normalizar). */
function newell(poly: readonly P3[]): [number, number, number] {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return [x, y, z];
}
/** Máxima distancia de un vértice al plano medio del polígono. */
function planarity(poly: readonly P3[]): number {
  const [nx, ny, nz] = newell(poly);
  const len = Math.hypot(nx, ny, nz);
  const c = poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length, s[2] + p[2] / poly.length], [0, 0, 0]);
  return Math.max(...poly.map((p) => Math.abs(((p[0] - c[0]) * nx + (p[1] - c[1]) * ny + (p[2] - c[2]) * nz) / len)));
}
const xz = (poly: readonly P3[]): Vec2[] => poly.map((p) => ({ x: p[0], z: p[2] }));

describe('buildRoofMesh (ROOF-2)', () => {
  it('ROOF-2: rectángulo a 2 aguas → 2 faldones, 2 hastiales, cumbrera a W/2·tan(pendiente)', () => {
    const r = buildRoofMesh(rect(20, 8), 'gabled', opts)!;
    expect(r.faces).toHaveLength(2);
    expect(r.gables).toHaveLength(2);
    expect(r.height).toBeCloseTo(4 * Math.tan(Math.PI / 6), 1);
    // Hastiales sobre los muros cortos (x = 0 y x = 20), de y = 0 a la cumbrera.
    for (const g of r.gables) {
      const xs = new Set(g.map((p) => p[0]));
      expect(xs.size).toBe(1);
      expect(Math.max(...g.map((p) => p[1]))).toBeCloseTo(r.height, 1);
      expect(Math.min(...g.map((p) => p[1]))).toBe(0);
    }
  });

  it('ROOF-2: 4 aguas respeta la altura máxima y los faldones miran hacia arriba y son planos', () => {
    for (const fp of [rect(40, 30), L]) {
      const r = buildRoofMesh(fp, 'hipped', { ...opts, maxHeight: 3 })!;
      expect(r.gables).toHaveLength(0);
      expect(r.height).toBeLessThanOrEqual(3.001);
      for (const f of r.faces) {
        expect(newell(f)[1]).toBeGreaterThan(0);
        expect(planarity(f)).toBeLessThan(0.02);
      }
    }
  });

  it('ROOF-2: el alero cubre el footprint (área proyectada mayor) y baja bajo el tope de muros', () => {
    for (const shape of ['gabled', 'hipped', 'pyramidal'] as const) {
      const r = buildRoofMesh(L, shape, opts)!;
      const area = r.faces.reduce((s, f) => s + polygonArea(xz(f)), 0);
      expect(area, shape).toBeGreaterThan(polygonArea(L));
      expect(Math.min(...r.faces.flat().map((p) => p[1])), shape).toBeLessThan(0);
    }
  });

  it('ROOF-2: planta en L a 2 aguas → hastiales en los extremos de las alas', () => {
    const r = buildRoofMesh(L, 'gabled', opts)!;
    expect(r.gables).toHaveLength(2);
    for (const f of r.faces) expect(planarity(f)).toBeLessThan(0.02);
  });

  it('ROOF-2: techo plano → sin malla', () => {
    expect(buildRoofMesh(rect(10, 10), 'flat', opts)).toBeNull();
  });

  it('ROOF-2: todos los footprints del campus generan techo inclinado válido', () => {
    const world = JSON.parse(readFileSync('data/world.json', 'utf8')) as { buildings: { id: string; footprint: Vec2[] }[] };
    for (const b of world.buildings) {
      for (const shape of ['gabled', 'hipped'] as const) {
        const r = buildRoofMesh(b.footprint, shape, opts);
        expect(r, `${b.id} ${shape}`).not.toBeNull();
        for (const f of r!.faces) {
          expect(newell(f)[1], b.id).toBeGreaterThan(-1e-6);
          expect(planarity(f), b.id).toBeLessThan(0.05);
        }
      }
    }
  });
});

describe('bóveda de cañón (ROOF-3)', () => {
  it('ROOF-3: rectángulo → faldones curvos sobre el eje largo, 2 tímpanos y flecha ≤ maxHeight', () => {
    const r = buildRoofMesh(rect(40, 20), 'round', { pitchDeg: 12, maxHeight: 4, eave: 0.4 })!;
    expect(r.faces.length).toBeGreaterThan(8);
    expect(r.gables).toHaveLength(2);
    expect(r.height).toBeLessThanOrEqual(4);
    expect(Math.max(...r.faces.flat().map((p) => p[1]))).toBeCloseTo(r.height, 1);
    for (const g of r.gables) expect(Math.min(...g.map((p) => p[1]))).toBe(0);
  });
  it('ROOF-3: footprint no rectangular → cae a 2 aguas por skeleton', () => {
    const r = buildRoofMesh(L, 'round', opts)!;
    expect(r.gables).toHaveLength(2);
  });
});
