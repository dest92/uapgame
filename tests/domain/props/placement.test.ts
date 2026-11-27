import { describe, it, expect } from 'vitest';
import { shrubPositions, benchPositions } from '../../../src/domain/props/placement';

const fp = [{ x: 0, z: 0 }, { x: 0, z: 10 }, { x: 20, z: 10 }, { x: 20, z: 0 }];

describe('ubicación de mobiliario', () => {
  it('arbustos a lo largo de la fachada, afuera del edificio y lejos de la entrada', () => {
    const pts = shrubPositions([{ footprint: fp, entrance: { x: 10, z: 10.5 } }], 3, 1.1);
    expect(pts.length).toBeGreaterThan(10);
    for (const p of pts) {
      const inside = p.x > 0 && p.x < 20 && p.z > 0 && p.z < 10;
      expect(inside).toBe(false);
      expect(Math.hypot(p.x - 10, p.z - 10.5)).toBeGreaterThan(2.5);
    }
  });
  it('bancos a un costado de senderos, orientados hacia el camino', () => {
    const b = benchPositions([{ points: [{ x: 0, z: 0 }, { x: 100, z: 0 }], width: 2 }], 40);
    expect(b.length).toBe(2);
    expect(Math.abs(b[0]!.z)).toBeCloseTo(1.9);
    expect(Number.isFinite(b[0]!.yaw)).toBe(true);
  });
});
