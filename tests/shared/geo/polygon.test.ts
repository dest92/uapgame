import { describe, it, expect } from 'vitest';
import {
  signedArea, ensureCCW, centroid, pointInPolygon, distanceToSegment,
  closestPointOnSegment, bboxOf, expandBBox, polygonArea, dedupeClosingPoint,
} from '@shared/geo/polygon';
import type { Vec2 } from '@shared/geo/types';

// En el plano XZ con Z hacia el sur, "CCW visto desde arriba" = área con signo > 0
// usando (x, -z). Nuestro helper abstrae esa convención.
const square: Vec2[] = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }, { x: 0, z: 10 }];

describe('polygon utils (GEO-5)', () => {
  it('GEO-5: área y orientación', () => {
    expect(polygonArea(square)).toBeCloseTo(100);
    const ccw = ensureCCW(square);
    expect(signedArea(ccw)).toBeGreaterThan(0);
    expect(signedArea(ensureCCW([...ccw].reverse()))).toBeGreaterThan(0);
  });

  it('GEO-5: centroide de un cuadrado', () => {
    const c = centroid(square);
    expect(c.x).toBeCloseTo(5);
    expect(c.z).toBeCloseTo(5);
  });

  it('GEO-5: punto en polígono', () => {
    expect(pointInPolygon({ x: 5, z: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 15, z: 5 }, square)).toBe(false);
  });

  it('GEO-5: distancia y punto más cercano en segmento', () => {
    const a = { x: 0, z: 0 };
    const b = { x: 10, z: 0 };
    expect(distanceToSegment({ x: 5, z: 3 }, a, b)).toBeCloseTo(3);
    expect(distanceToSegment({ x: -4, z: 3 }, a, b)).toBeCloseTo(5);
    expect(closestPointOnSegment({ x: 20, z: 1 }, a, b)).toEqual({ x: 10, z: 0 });
  });

  it('GEO-5: bbox y expansión', () => {
    const bb = bboxOf(square);
    expect(bb).toEqual({ minX: 0, minZ: 0, maxX: 10, maxZ: 10 });
    expect(expandBBox(bb, 5)).toEqual({ minX: -5, minZ: -5, maxX: 15, maxZ: 15 });
  });

  it('GEO-5: elimina el punto de cierre repetido', () => {
    expect(dedupeClosingPoint([...square, { x: 0, z: 0 }])).toHaveLength(4);
  });
});
