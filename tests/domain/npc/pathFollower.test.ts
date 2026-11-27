import { describe, it, expect } from 'vitest';
import { PathFollower } from '../../../src/domain/npc/PathFollower';

const line = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }];

describe('PathFollower', () => {
  it('avanza por la polilínea a la velocidad dada y orienta el rumbo', () => {
    const f = new PathFollower(line, 1.5, 0);
    f.step(2);
    expect(f.position.x).toBeCloseTo(3);
    expect(f.heading).toBeCloseTo(Math.PI / 2); // hacia +X
  });
  it('dobla en los vértices', () => {
    const f = new PathFollower(line, 1, 0);
    f.step(12);
    expect(f.position).toMatchObject({ x: 10 });
    expect(f.position.z).toBeCloseTo(2);
  });
  it('al llegar al final vuelve (ida y vuelta)', () => {
    const f = new PathFollower(line, 1, 0);
    f.step(21);
    expect(f.position.z).toBeCloseTo(9);
    expect(f.heading).toBeCloseTo(Math.PI); // hacia −Z
  });
});
