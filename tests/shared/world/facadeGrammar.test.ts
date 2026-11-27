import { describe, it, expect } from 'vitest';
import { FACADE, layoutWall, solidRects } from '@shared/world/facadeGrammar';

describe('gramática de fachada (FAC-1..3)', () => {
  it('FAC-1: cantidad de ventanas = bahías × pisos que entran bajo el margen superior', () => {
    // 20 m → 6 bahías; 6.4 m + parapeto 0.6 → 2 pisos.
    const l = layoutWall({ length: 20, height: 7 });
    expect(l.bays).toBe(6);
    expect(l.openings.filter((o) => o.kind === 'window')).toHaveLength(12);
    // Grilla centrada: margen igual a ambos lados.
    expect(l.offset).toBeCloseTo((20 - 6 * FACADE.BAY) / 2, 9);
  });

  it('FAC-1: ninguna ventana se sale de la pared ni pisa el margen superior', () => {
    for (const length of [2.7, 3.3, 7.9, 13, 41.7]) {
      for (const height of [3.2, 3.8, 6.4, 7, 9.6, 10.2]) {
        const l = layoutWall({ length, height, doorU: length * 0.3 });
        for (const o of l.openings) {
          expect(o.u0).toBeGreaterThanOrEqual(0);
          expect(o.u1).toBeLessThanOrEqual(length);
          expect(o.v1).toBeLessThanOrEqual(height - (o.kind === 'door' ? 0.3 : FACADE.TOP_MARGIN) + 1e-9);
          expect(o.u1 - o.u0).toBeGreaterThan(0);
        }
      }
    }
  });

  it('FAC-1: paredes cortas no tienen ventanas', () => {
    expect(layoutWall({ length: 2.5, height: 6.4 }).openings).toHaveLength(0);
  });

  it('FAC-2: la puerta reemplaza la ventana de planta baja de su bahía y arranca en el umbral', () => {
    const l = layoutWall({ length: 20, height: 7, doorU: 9.5, doorV: 0.3 });
    const door = l.openings.find((o) => o.kind === 'door')!;
    expect(door.v0).toBeCloseTo(0.3);
    expect(door.u1 - door.u0).toBeCloseTo(FACADE.DOOR_W);
    const sameBay = l.openings.filter((o) => o.kind === 'window' && o.level === 0 && o.bay === door.bay);
    expect(sameBay).toHaveLength(0);
    // Ningún vano se superpone con otro.
    for (const a of l.openings) for (const b of l.openings) {
      if (a === b) continue;
      const overlap = a.u0 < b.u1 && b.u0 < a.u1 && a.v0 < b.v1 && b.v0 < a.v1;
      expect(overlap).toBe(false);
    }
  });

  it('FAC-3: muro macizo + vanos cubren exactamente la pared', () => {
    const l = layoutWall({ length: 17.3, height: 7, doorU: 4 });
    const rects = solidRects(17.3, -1.5, 7, l.openings);
    const solid = rects.reduce((s, r) => s + (r.u1 - r.u0) * (r.v1 - r.v0), 0);
    const holes = l.openings.reduce((s, o) => s + (o.u1 - o.u0) * (o.v1 - o.v0), 0);
    expect(solid + holes).toBeCloseTo(17.3 * 8.5, 6);
    for (const r of rects) for (const o of l.openings) {
      const overlap = r.u0 < o.u1 - 1e-9 && o.u0 < r.u1 - 1e-9 && r.v0 < o.v1 - 1e-9 && o.v0 < r.v1 - 1e-9;
      expect(overlap).toBe(false);
    }
  });
});
