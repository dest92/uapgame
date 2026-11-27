import { describe, it, expect } from 'vitest';
import { TimeFlow } from '../../../src/domain/sky/TimeFlow';

describe('TimeFlow', () => {
  it('no avanza si está pausado; avanza 1 h cada 20 s y da la vuelta a las 24', () => {
    const t = new TimeFlow();
    expect(t.advance(10, 20)).toBe(10);
    t.running = true;
    expect(t.advance(10, 20)).toBeCloseTo(11);
    expect(t.advance(23.5, 20)).toBeCloseTo(0.5);
  });
});
