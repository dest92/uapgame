import { describe, it, expect } from 'vitest';
import { FixedStepClock } from '../../src/core/loop/FixedStepClock';

describe('FixedStepClock (LOOP-1/2)', () => {
  it('LOOP-1: ejecuta pasos fijos y devuelve alpha', () => {
    const clock = new FixedStepClock(1 / 60);
    const steps: number[] = [];
    const alpha = clock.advance(0.05, (dt) => steps.push(dt));
    expect(steps).toHaveLength(3); // 0.05 / 0.01666 = 3 pasos
    expect(steps[0]).toBeCloseTo(1 / 60);
    expect(alpha).toBeGreaterThanOrEqual(0);
    expect(alpha).toBeLessThan(1);
  });
  it('LOOP-1: acumula restos entre frames', () => {
    const clock = new FixedStepClock(0.1);
    let n = 0;
    clock.advance(0.06, () => n++);
    clock.advance(0.06, () => n++);
    expect(n).toBe(1);
  });
  it('LOOP-2: recorta frames largos', () => {
    const clock = new FixedStepClock(1 / 60, 0.25);
    let n = 0;
    clock.advance(5, () => n++);
    expect(n).toBe(15);
  });
});
