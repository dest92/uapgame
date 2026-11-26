import { describe, it, expect } from 'vitest';
import { footprintPrism, gridTrimesh } from '../../src/physics/colliderShapes';

describe('collider shapes', () => {
  it('prisma de footprint: 2 anillos de vértices, paredes + tapas', () => {
    const fp = [{ x: 0, z: 0 }, { x: 0, z: 10 }, { x: 20, z: 10 }, { x: 20, z: 0 }];
    const m = footprintPrism(fp, -1, 6);
    expect(m.vertices.length).toBe(8 * 3);
    // 4 paredes × 2 tris + 2 tapas × 2 tris
    expect(m.indices.length).toBe((8 + 4) * 3);
    expect(Math.max(...m.vertices.filter((_, i) => i % 3 === 1))).toBe(6);
  });
  it('trimesh de grilla de terreno', () => {
    const m = gridTrimesh({ originX: 0, originZ: 0, cellSize: 10, cols: 3, rows: 2, heights: [0, 1, 2, 3, 4, 5] });
    expect(m.vertices.length).toBe(6 * 3);
    expect(m.indices.length).toBe(2 * 2 * 3);
    expect(m.vertices[3 * 5 + 1]).toBe(5);
  });
});
