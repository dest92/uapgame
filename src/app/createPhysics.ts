import type { WorldData } from '@shared/world/types';
import { footprintPrism, gridTrimesh } from '../physics/colliderShapes';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { RapierPhysicsWorld } from '../physics/RapierPhysicsWorld';
import { groundUnder } from '../world/buildings/BuildingsBuilder';
import type { TerrainSampler } from '../world/terrain/terrainSampler';
import { terrainGridOf } from '../world/terrain/terrainGrid';

/** Colliders estáticos: terreno + prismas de edificios (también para hero assets). */
export async function createPhysics(world: WorldData, terrain: TerrainSampler, trees: readonly { x: number; z: number }[] = []): Promise<PhysicsWorld> {
  const physics = await RapierPhysicsWorld.create();
  // Troncos y postes: cilindros delgados (no se atraviesan).
  for (const t of trees) physics.addStaticCylinder({ x: t.x, y: terrain.heightAt(t.x, t.z) + 1.5, z: t.z }, 1.5, 0.28);
  physics.addStaticMesh(gridTrimesh(terrainGridOf(world, terrain)));
  for (const b of world.buildings) {
    const ground = groundUnder(b, terrain);
    physics.addStaticMesh(footprintPrism(b.footprint, ground - 2, ground + b.height + b.roof.height));
  }
  return physics;
}
