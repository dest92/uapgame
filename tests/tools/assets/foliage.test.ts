import { describe, it, expect } from 'vitest';
import { thinFoliage, triangleComponents } from '../../../tools/lib/assets/foliageDecimation';

// 100 "hojas" triangulares disjuntas.
const n = 100;
const positions = new Float32Array(n * 9);
const indices = new Uint32Array(n * 3);
for (let i = 0; i < n; i++) {
  positions.set([i, 0, 0, i + 0.2, 0, 0, i, 0.2, 0], i * 9);
  indices.set([i * 3, i * 3 + 1, i * 3 + 2], i * 3);
}

describe('decimación de follaje', () => {
  it('cuenta islas disjuntas', () => {
    expect(new Set(triangleComponents(indices, n * 3)).size).toBe(100);
  });
  it('conserva ~la fracción pedida de hojas y las agranda sobre su centro', () => {
    const out = thinFoliage({ positions, indices }, 0.25, 2);
    const kept = out.indices.length / 3;
    expect(kept).toBeGreaterThan(10);
    expect(kept).toBeLessThan(45);
    const v = out.indices[0]!;
    const leaf = Math.floor(v / 3);
    const cx = leaf + 0.2 / 3;
    expect(out.positions[leaf * 9]!).toBeCloseTo(cx + (leaf - cx) * 2, 5);
  });
  it('es determinista', () => {
    expect(thinFoliage({ positions, indices }, 0.3, 1.5).indices).toEqual(thinFoliage({ positions, indices }, 0.3, 1.5).indices);
  });
});
