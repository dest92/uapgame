import { HeightField, type HeightSampler } from '@shared/terrain/heightField';
import type { TerrainData } from '@shared/world/types';

export type TerrainSampler = HeightSampler & { normalAt(x: number, z: number): { x: number; y: number; z: number } };

/**
 * Sampler de altura del mundo. Con MDE usa el heightmap; si no, plano con una
 * ondulación procedural suave (TODO documentado en missing-info si no hay MDE).
 */
export function createTerrainSampler(t: TerrainData): TerrainSampler {
  if (t.kind === 'heightmap' && t.grid) return new HeightField(t.grid);
  const heightAt = (x: number, z: number): number =>
    0.6 * Math.sin(x * 0.011) * Math.cos(z * 0.009) + 0.3 * Math.sin((x + z) * 0.023);
  return {
    heightAt,
    normalAt: (x, z) => {
      const dx = heightAt(x + 1, z) - heightAt(x - 1, z);
      const dz = heightAt(x, z + 1) - heightAt(x, z - 1);
      const l = Math.hypot(dx, 2, dz);
      return { x: -dx / l, y: 2 / l, z: -dz / l };
    },
  };
}
