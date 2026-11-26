import { describe, it, expect } from 'vitest';
import { findInteractionTarget, INTERACTION_RADIUS } from '../../../src/domain/interaction/InteractionQuery';

const targets = [
  { id: 'a', name: 'A', entrance: { x: 0, z: 0 } },
  { id: 'b', name: 'B', entrance: { x: 3, z: 0 } },
];

describe('findInteractionTarget (INT-1)', () => {
  it('INT-1: radio de 4 m', () => expect(INTERACTION_RADIUS).toBe(4));
  it('INT-1: devuelve el más cercano dentro del radio', () => {
    expect(findInteractionTarget({ x: 2.4, z: 0 }, targets)?.id).toBe('b');
    expect(findInteractionTarget({ x: 1, z: 0.5 }, targets)?.id).toBe('a');
  });
  it('INT-1: null fuera de radio', () => {
    expect(findInteractionTarget({ x: 20, z: 20 }, targets)).toBeNull();
  });
});
