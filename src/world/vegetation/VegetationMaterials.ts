import type { Material, MeshStandardMaterial, Texture } from 'three/webgpu';
import type { FoliageKind } from './foliageTextures';

/** Puerto de materiales de vegetación y mobiliario (lo implementa la capa de render). */
export interface VegetationMaterials {
  bark(): Material;
  foliage(kind: FoliageKind, treeHeight: number): Material;
  /** Adapta un material de modelo escaneado (agrega viento a las hojas). */
  fromModel(source: MeshStandardMaterial, treeHeight: number): Material;
  grass(field: GrassFieldParams): Material;
  lampPole(): Material;
  lampHead(): Material;
}

export interface GrassFieldParams {
  readonly radius: number;
  readonly heightMap: Texture;
  readonly splat: Texture;
  readonly bounds: { readonly minX: number; readonly minZ: number; readonly maxX: number; readonly maxZ: number };
}
