import { describe, it, expect } from 'vitest';
import { MapTransform } from '../../../src/domain/minimap/MapTransform';

describe('MapTransform (MAP-3)', () => {
  it('MAP-3: el centro del mundo cae en el centro del mapa', () => {
    const t = new MapTransform(200, 2);
    expect(t.toMap({ x: 10, z: 10 }, { x: 10, z: 10 }, 0)).toEqual({ x: 100, y: 100 });
  });
  it('MAP-3: escala: 10 m al este → +20 px', () => {
    const t = new MapTransform(200, 2);
    const p = t.toMap({ x: 10, z: 0 }, { x: 0, z: 0 }, 0);
    expect(p.x).toBeCloseTo(120);
    expect(p.y).toBeCloseTo(100);
  });
  it('MAP-3: rotación con el heading (adelante siempre hacia arriba)', () => {
    const t = new MapTransform(200, 2);
    // Mirando al este (heading = −π/2 en convención yaw de cámara), un punto al este queda arriba.
    const p = t.toMap({ x: 10, z: 0 }, { x: 0, z: 0 }, -Math.PI / 2);
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(80);
  });
});
