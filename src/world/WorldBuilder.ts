import { Group, type Texture } from 'three/webgpu';
import type { HeightGrid } from '@shared/terrain/heightField';
import type { WorldData } from '@shared/world/types';
import { buildBuildings } from './buildings/BuildingsBuilder';
import type { MaterialProvider } from './MaterialProvider';
import { buildRoads } from './roads/RoadsBuilder';
import { buildGround, type GroundOptions } from './terrain/GroundBuilder';
import { createTerrainSampler, type TerrainSampler } from './terrain/terrainSampler';
import { terrainGridOf } from './terrain/terrainGrid';
import { buildWater } from './props/WaterBuilder';

export interface BuiltWorld {
  readonly root: Group;
  readonly terrain: TerrainSampler;
  readonly grid: HeightGrid;
  /** Splat map del suelo (lo reutiliza el pasto). */
  readonly splat: Texture;
}

export interface WorldBuildOptions {
  readonly ground: GroundOptions;
  /** Edificios reemplazados por hero assets. */
  readonly skipBuildings: ReadonlySet<string>;
}

/** Ensambla la escena estática del campus desde world.json. */
export function buildWorldScene(world: WorldData, materials: MaterialProvider, opts: WorldBuildOptions): BuiltWorld {
  const terrain = createTerrainSampler(world.terrain);
  const root = new Group();
  root.name = 'world';
  const ground = buildGround(world, terrain, materials, opts.ground);
  root.add(ground.mesh);
  root.add(buildRoads(world.roads, terrain, materials));
  root.add(buildBuildings(world.buildings, terrain, materials, opts.skipBuildings));
  buildWater(root, world.areas, terrain, materials.water());
  return { root, terrain, grid: terrainGridOf(world, terrain), splat: ground.splat };
}
