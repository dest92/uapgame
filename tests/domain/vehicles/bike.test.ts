import { describe, it, expect } from 'vitest';
import { BikeModel, BIKE_MAX_SPEED, BIKE_SPRINT_SPEED, initialBikeState } from '../../../src/domain/vehicles/BikeModel';

const run = (input: { throttle: number; steer: number; sprint: boolean }, seconds: number, start = initialBikeState(0)) => {
  const m = new BikeModel();
  let s = start;
  for (let t = 0; t < seconds; t += 1 / 60) s = m.step(s, input, 1 / 60).state;
  return s;
};

describe('BikeModel (VEH-1..4)', () => {
  it('VEH-1: acelera hasta la velocidad crucero y con sprint hasta la máxima', () => {
    expect(run({ throttle: 1, steer: 0, sprint: false }, 8).speed).toBeCloseTo(BIKE_MAX_SPEED, 0);
    expect(run({ throttle: 1, steer: 0, sprint: true }, 10).speed).toBeCloseTo(BIKE_SPRINT_SPEED, 0);
  });
  it('VEH-1: avanza hacia donde apunta (heading 0 → +Z)', () => {
    const m = new BikeModel();
    const r = m.step({ ...initialBikeState(0), speed: 5 }, { throttle: 1, steer: 0, sprint: false }, 0.1);
    expect(r.displacement.z).toBeGreaterThan(0.4);
    expect(Math.abs(r.displacement.x)).toBeLessThan(1e-9);
  });
  it('VEH-2: frena con throttle negativo y no anda marcha atrás rápido', () => {
    const s = run({ throttle: -1, steer: 0, sprint: false }, 4, { ...initialBikeState(0), speed: 6 });
    expect(s.speed).toBeLessThanOrEqual(0);
    expect(s.speed).toBeGreaterThan(-1.6);
  });
  it('VEH-3: gira solo en movimiento y más cerrado a menor velocidad', () => {
    expect(run({ throttle: 0, steer: 1, sprint: false }, 1).heading).toBeCloseTo(0, 5);
    const slow = run({ throttle: 0.3, steer: 1, sprint: false }, 1, { ...initialBikeState(0), speed: 2 });
    expect(Math.abs(slow.heading)).toBeGreaterThan(0.3);
  });
  it('VEH-4: se inclina hacia la curva (lean) proporcional a velocidad × giro', () => {
    const s = run({ throttle: 1, steer: 1, sprint: false }, 1, { ...initialBikeState(0), speed: 5 });
    expect(Math.abs(s.lean)).toBeGreaterThan(0.1);
    expect(Math.abs(s.lean)).toBeLessThan(0.6);
  });
  it('sin input la bici rueda por inercia y se detiene', () => {
    expect(run({ throttle: 0, steer: 0, sprint: false }, 12, { ...initialBikeState(0), speed: 5 }).speed).toBeLessThan(0.05);
  });
});
