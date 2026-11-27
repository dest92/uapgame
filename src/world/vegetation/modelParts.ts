import { Mesh, type Material, type MeshStandardMaterial } from 'three/webgpu';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { TreePart } from './TreeVariant';
import type { VegetationMaterials } from './VegetationMaterials';

/** Agrupa las mallas del GLB por material (una parte instanciable por material). */
export function partsOf(gltf: GLTF, mats: VegetationMaterials, height: number): TreePart[] {
  const byMaterial = new Map<Material, Mesh[]>();
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const list = byMaterial.get(o.material as Material) ?? [];
    list.push(o);
    byMaterial.set(o.material as Material, list);
  });
  return [...byMaterial].map(([material, meshes]) => {
    const geos = meshes.map((m) => m.geometry.clone().applyMatrix4(m.matrixWorld));
    const geometry = geos.length === 1 ? geos[0]! : mergeGeometries(geos, false)!;
    return { geometry, material: mats.fromModel(material as MeshStandardMaterial, height) };
  });
}

