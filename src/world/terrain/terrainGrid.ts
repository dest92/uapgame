import { HeightField, type HeightGrid } from '@shared/terrain/heightField';
import type { WorldData } from '@shared/world/types';
import type { HeightSampler } from '@shared/terrain/heightField';

/** Grilla de alturas del mundo: la del MDE o, si es plano, muestreada del sampler procedural. */
export function terrainGridOf(world: WorldData, terrain: HeightSampler, cell = 10): HeightGrid {
  if (world.terrain.grid) return world.terrain.grid;
  const { bounds } = world;
  const cols = Math.ceil((bounds.maxX - bounds.minX) / cell) + 1;
  const rows = Math.ceil((bounds.maxZ - bounds.minZ) / cell) + 1;
  const heights: number[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) heights.push(terrain.heightAt(bounds.minX + c * cell, bounds.minZ + r * cell));
  return new HeightField({ originX: bounds.minX, originZ: bounds.minZ, cellSize: cell, cols, rows, heights }).data;
}
