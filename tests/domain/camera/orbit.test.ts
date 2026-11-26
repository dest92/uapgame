import { describe, it, expect } from 'vitest';
import { OrbitModel, PITCH_MIN, PITCH_MAX, DIST_MIN, DIST_MAX } from '../../../src/domain/camera/OrbitModel';

describe('OrbitModel', () => {
  it('CAM-1: pitch y distancia limitados', () => {
    const o = new OrbitModel();
    o.look(0, 100);
    expect(o.pitch).toBe(PITCH_MAX);
    o.look(0, -100);
    expect(o.pitch).toBe(PITCH_MIN);
    o.zoom(100);
    expect(o.distance).toBe(DIST_MAX);
    o.zoom(-100);
    expect(o.distance).toBe(DIST_MIN);
  });
  it('CAM-1: posición deseada detrás del objetivo según yaw', () => {
    const o = new OrbitModel({ yaw: 0, pitch: 0, distance: 5 });
    const p = o.desiredOffset();
    expect(p.z).toBeCloseTo(5);
    expect(p.x).toBeCloseTo(0);
  });
  it('CAM-2: colisión acorta la distancia al impacto − 0.2 m (inmediato)', () => {
    const o = new OrbitModel({ yaw: 0, pitch: 0.3, distance: 6 });
    expect(o.resolveDistance(3, 1 / 60)).toBeCloseTo(2.8);
  });
  it('CAM-3: al liberarse vuelve suavemente (damping)', () => {
    const o = new OrbitModel({ yaw: 0, pitch: 0.3, distance: 6 });
    o.resolveDistance(2, 1 / 60);
    const d = o.resolveDistance(null, 1 / 60);
    expect(d).toBeGreaterThan(1.8);
    expect(d).toBeLessThan(6);
  });
  it('CAM-3: la cámara nunca queda bajo el terreno', () => {
    expect(OrbitModel.clampAboveGround(-1, 0.5)).toBeCloseTo(0.8);
    expect(OrbitModel.clampAboveGround(4, 0.5)).toBe(4);
  });
});
