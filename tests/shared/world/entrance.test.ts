import { describe, it, expect } from 'vitest';
import { computeEntrance } from '@shared/world/entrance';
import type { Vec2 } from '@shared/geo/types';

// Edificio 20×10 m (CCW en vista mapa).
const fp: Vec2[] = [{ x: 0, z: 0 }, { x: 0, z: 10 }, { x: 20, z: 10 }, { x: 20, z: 0 }];

describe('computeEntrance (WLD-9)', () => {
  it('WLD-9: entrada en el borde más cercano a un sendero, 0.5 m afuera', () => {
    const path: Vec2[] = [{ x: -5, z: 14 }, { x: 25, z: 14 }]; // sendero al sur
    const e = computeEntrance(fp, [path]);
    expect(e.position.z).toBeCloseTo(10.5, 5);
    expect(e.position.x).toBeGreaterThanOrEqual(0);
    expect(e.position.x).toBeLessThanOrEqual(20);
    expect(e.normal.z).toBeCloseTo(1, 5);
  });
  it('WLD-9: sin caminos → punto medio de la arista más larga', () => {
    const e = computeEntrance(fp, []);
    expect(e.position.x).toBeCloseTo(10, 5);
    expect(Math.abs(e.position.z - 5)).toBeCloseTo(5.5, 5);
  });
  it('WLD-9: ignora caminos lejanos (> 60 m) y usa el fallback', () => {
    const far: Vec2[] = [{ x: 500, z: 500 }, { x: 600, z: 500 }];
    expect(computeEntrance(fp, [far]).position.x).toBeCloseTo(10, 5);
  });
});
