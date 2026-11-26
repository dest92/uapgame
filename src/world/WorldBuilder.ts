import { Group } from 'three/webgpu';
import type { WorldData } from '@shared/world/types';
import { buildBuildings } from './buildings/BuildingsBuilder';
import type { MaterialProvider } from './MaterialProvider';
import { buildRoads } from './roads/RoadsBuilder';
import { buildGround, type GroundOptions } from './terrain/GroundBuilder';
import { createTerrainSampler, type TerrainSampler } from './terrain/terrainSampler';

export interface BuiltWorld {
  readonly root: Group;
  readonly terrain: TerrainSampler;
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
  root.add(buildGround(world, terrain, materials, opts.ground));
  root.add(buildRoads(world.roads, terrain, materials));
  root.add(buildBuildings(world.buildings, terrain, materials, opts.skipBuildings));
  return { root, terrain };
}
