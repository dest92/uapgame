import { describe, it, expect } from 'vitest';
import { photoFacadeGeometry } from '../../src/world/buildings/photoFacade';
import { makeWorld } from '../fixtures/world';

describe('fachada con foto', () => {
  it('cubre la pared de la entrada (sur, z=10) con UV 0..1, despegada hacia afuera', () => {
    const b = makeWorld().buildings[0]!; // entrada en z = 10.5
    const g = photoFacadeGeometry(b, 2);
    const zs = g.positions.filter((_, i) => i % 3 === 2);
    for (const z of zs) expect(z).toBeCloseTo(10.04, 5);
    expect(Math.max(...g.positions.filter((_, i) => i % 3 === 1))).toBeCloseTo(2 + b.height, 5);
    expect(g.uvs).toEqual([0, 0, 1, 0, 1, 1, 0, 1]);
  });
});
