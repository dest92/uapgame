import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { partsOf } from './modelParts';
import type { TreeSpecies } from '@shared/world/types';
import type { TreeVariant, TreeVariantProvider } from './TreeVariant';
import type { VegetationMaterials } from './VegetationMaterials';

export interface ModelTreeSpec {
  readonly species: TreeSpecies;
  readonly lod0: string;
  readonly lod1: string;
  readonly baseScale: number;
  readonly lodDistance: number;
}

/** Jacarandá escaneado (Poly Haven, CC0) como latifoliada principal del campus. */
export const SCANNED_TREES: readonly ModelTreeSpec[] = [
  { species: 'broadleaf', lod0: 'models/vegetation/jacaranda_tree_lod0.glb', lod1: 'models/vegetation/jacaranda_tree_lod1.glb', baseScale: 0.62, lodDistance: 45 },
];

/** Árboles a partir de modelos glTF optimizados por tools/build-vegetation-models.ts. */
export class ModelTreeProvider implements TreeVariantProvider {
  private constructor(private readonly variants: ReadonlyMap<TreeSpecies, TreeVariant>) {}

  static async load(load: (url: string) => Promise<GLTF>, mats: VegetationMaterials, specs = SCANNED_TREES): Promise<ModelTreeProvider> {
    const map = new Map<TreeSpecies, TreeVariant>();
    await Promise.all(specs.map(async (s) => {
      try {
        const [g0, g1] = await Promise.all([load(s.lod0), load(s.lod1)]);
        const height = 19 * s.baseScale;
        map.set(s.species, { lods: [partsOf(g0, mats, height), partsOf(g1, mats, height)], baseScale: s.baseScale, lodDistance: s.lodDistance });
      } catch (err) {
        console.warn(`[vegetation] sin modelo para ${s.species}, uso procedural`, err);
      }
    }));
    return new ModelTreeProvider(map);
  }

  variant(species: TreeSpecies): TreeVariant | null {
    return this.variants.get(species) ?? null;
  }
}
