import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, Mesh } from 'three/webgpu';
import type { WorldData } from '@shared/world/types';
import type { MaterialProvider } from '../MaterialProvider';
import { paintSplatMap } from './GroundPainter';
import { buildTerrainGeometry } from './TerrainMeshBuilder';
import type { TerrainSampler } from './terrainSampler';

export interface GroundOptions {
  readonly cellSize: number;
  readonly splatPxPerMeter: number;
  readonly splatMaxSize: number;
}

/** Terreno + textura de mezcla pintada desde world.json. */
export function buildGround(world: WorldData, terrain: TerrainSampler, materials: MaterialProvider, opts: GroundOptions): { mesh: Mesh; splat: CanvasTexture } {
  const splatCanvas = paintSplatMap(world, opts.splatPxPerMeter, opts.splatMaxSize);
  const splat = new CanvasTexture(splatCanvas);
  // El canvas tiene y=0 en minZ; la UV del terreno también: sin flip vertical.
  splat.flipY = false;
  // Es una textura de datos: se deja en NoColorSpace (default) para no aplicar conversión sRGB.
  splat.minFilter = LinearMipmapLinearFilter;
  splat.magFilter = LinearFilter;
  splat.anisotropy = 4;
  const { bounds } = world;
  const geo = buildTerrainGeometry(bounds, terrain, opts.cellSize, 600);
  const mesh = new Mesh(geo, materials.ground(splat, { width: bounds.maxX - bounds.minX, depth: bounds.maxZ - bounds.minZ }));
  mesh.name = 'ground';
  mesh.receiveShadow = true;
  return { mesh, splat };
}
