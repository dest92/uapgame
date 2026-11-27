import { describe, expect, it } from 'vitest';
import { signedArea } from '../../../shared/geo/polygon';
import { edgeFrame, fitCircle, framesAlongArc, insetPolygon, toWorld, yawOf } from '../../../tools/hero/lib/frame';

const square = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: -10 }, { x: 0, z: -10 }]; // CCW en mapa (Norte = −Z)

describe('marcos de hero assets', () => {
  it('fitCircle recupera centro y radio de puntos sobre un arco', () => {
    const pts = [0, 0.4, 0.8, 1.2].map((a) => ({ x: 3 + Math.cos(a) * 20, z: -5 + Math.sin(a) * 20 }));
    const c = fitCircle(pts);
    expect(c.center.x).toBeCloseTo(3, 6);
    expect(c.center.z).toBeCloseTo(-5, 6);
    expect(c.radius).toBeCloseTo(20, 6);
  });

  it('edgeFrame: la normal de un polígono CCW apunta hacia afuera y cumple la mano derecha', () => {
    expect(signedArea(square)).toBeGreaterThan(0);
    const f = edgeFrame(square[0]!, square[1]!);
    expect(f.normal).toEqual({ x: -0, z: 1 }); // arista sur → mira al Sur (+Z)
    expect(f.normal.x).toBeCloseTo(-f.tangent.z);
    expect(f.normal.z).toBeCloseTo(f.tangent.x);
  });

  it('yawOf lleva +X local a la tangente (convención three.js)', () => {
    const f = edgeFrame({ x: 0, z: 0 }, { x: 0, z: -5 });
    const yaw = yawOf(f);
    expect(Math.cos(yaw)).toBeCloseTo(f.tangent.x);
    expect(-Math.sin(yaw)).toBeCloseTo(f.tangent.z);
  });

  it('framesAlongArc reparte las piezas de izquierda a derecha con normales radiales', () => {
    const frames = framesAlongArc({ x: 0, z: 0 }, 30, Math.PI / 2, [6, 6, 6]);
    expect(frames).toHaveLength(3);
    for (const f of frames) {
      expect(Math.hypot(f.origin.x, f.origin.z)).toBeCloseTo(30);
      expect(f.normal.x).toBeCloseTo(f.origin.x / 30);
      expect(f.normal.x).toBeCloseTo(-f.tangent.z);
    }
    // Avanzar por +X local del primero acerca al segundo (orden izquierda → derecha visto desde afuera).
    const p = toWorld(frames[0]!, 6, 0);
    const d0 = Math.hypot(frames[1]!.origin.x - frames[0]!.origin.x, frames[1]!.origin.z - frames[0]!.origin.z);
    expect(Math.hypot(frames[1]!.origin.x - p.x, frames[1]!.origin.z - p.z)).toBeLessThan(d0);
  });

  it('insetPolygon achica (d > 0) y agranda (d < 0) un cuadrado', () => {
    const inner = insetPolygon(square, 1, true);
    const outer = insetPolygon(square, -1, true);
    expect(signedArea(inner)).toBeCloseTo(64);
    expect(signedArea(outer)).toBeCloseTo(144);
  });
});
