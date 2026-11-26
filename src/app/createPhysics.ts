import type { WorldData } from '@shared/world/types';
import { HeightField, type HeightGrid } from '@shared/terrain/heightField';
import { footprintPrism, gridTrimesh } from '../physics/colliderShapes';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { RapierPhysicsWorld } from '../physics/RapierPhysicsWorld';
import { groundUnder } from '../world/buildings/BuildingsBuilder';
import type { TerrainSampler } from '../world/terrain/terrainSampler';

/** Grilla de colisión del terreno: la del MDE o, si es plano, muestreada del sampler procedural. */
function terrainGrid(world: WorldData, terrain: TerrainSampler): HeightGrid {
  if (world.terrain.grid) return world.terrain.grid;
  const cell = 10;
  const { bounds } = world;
  const cols = Math.ceil((bounds.maxX - bounds.minX) / cell) + 1;
  const rows = Math.ceil((bounds.maxZ - bounds.minZ) / cell) + 1;
  const heights: number[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) heights.push(terrain.heightAt(bounds.minX + c * cell, bounds.minZ + r * cell));
  return new HeightField({ originX: bounds.minX, originZ: bounds.minZ, cellSize: cell, cols, rows, heights }).data;
}

/** Colliders estáticos: terreno + prismas de edificios (también para hero assets). */
export async function createPhysics(world: WorldData, terrain: TerrainSampler): Promise<PhysicsWorld> {
  const physics = await RapierPhysicsWorld.create();
  physics.addStaticMesh(gridTrimesh(terrainGrid(world, terrain)));
  for (const b of world.buildings) {
    const ground = groundUnder(b, terrain);
    physics.addStaticMesh(footprintPrism(b.footprint, ground - 2, ground + b.height + b.roof.height));
  }
  return physics;
}
