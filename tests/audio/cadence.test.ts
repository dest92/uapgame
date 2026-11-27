import { describe, it, expect } from 'vitest';
import { stepInterval, birdChance } from '../../src/audio/cadence';

describe('cadencia de sonidos', () => {
  it('pasos más rápidos al correr; sin pasos quieto', () => {
    expect(stepInterval(0)).toBe(Infinity);
    expect(stepInterval(1.6)).toBeGreaterThan(stepInterval(5.5));
    expect(stepInterval(1.6)).toBeCloseTo(0.55, 1);
  });
  it('pájaros de día, casi nada de noche', () => {
    expect(birdChance(0)).toBeGreaterThan(birdChance(1));
    expect(birdChance(1)).toBeLessThan(0.05);
  });
});
