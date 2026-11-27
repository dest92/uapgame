import type { BufferGeometry, Material } from 'three/webgpu';
import type { TreeSpecies } from '@shared/world/types';
import { toBufferGeometry } from '../geometry/GeometryData';
import { buildTree } from './TreeGeometry';
import type { VegetationMaterials } from './VegetationMaterials';

export interface TreePart {
  readonly geometry: BufferGeometry;
  readonly material: Material;
}

/** Un árbol listo para instanciar: partes por LOD (0 = cerca, 1 = lejos) y escala base. */
export interface TreeVariant {
  readonly lods: readonly [readonly TreePart[], readonly TreePart[]];
  /** Multiplica la escala de cada instancia (los modelos escaneados traen su tamaño real). */
  readonly baseScale: number;
  /** Distancia de cambio a LOD bajo (los modelos pesados conmutan antes). */
  readonly lodDistance: number;
}

export interface TreeVariantProvider {
  variant(species: TreeSpecies): TreeVariant | null;
}

/** Árboles procedurales (siempre disponibles, 0 bytes de descarga). */
export class ProceduralTreeProvider implements TreeVariantProvider {
  constructor(private readonly mats: VegetationMaterials) {}

  variant(species: TreeSpecies): TreeVariant {
    const lod = (l: 0 | 1): TreePart[] => {
      const parts = buildTree(species, l);
      return [
        { geometry: toBufferGeometry(parts.trunk), material: this.mats.bark() },
        { geometry: toBufferGeometry(parts.foliage), material: this.mats.foliage(species, parts.height) },
      ];
    };
    return { lods: [lod(0), lod(1)], baseScale: 1, lodDistance: 75 };
  }
}

/** Compone proveedores: usa el primero que tenga la especie (p.ej. escaneado → procedural). */
export class FallbackTreeProvider implements TreeVariantProvider {
  constructor(private readonly providers: readonly TreeVariantProvider[]) {}

  variant(species: TreeSpecies): TreeVariant | null {
    for (const p of this.providers) {
      const v = p.variant(species);
      if (v) return v;
    }
    return null;
  }
}
