import { BufferAttribute, Mesh, type BufferGeometry, type Material, type MeshStandardMaterial } from 'three/webgpu';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { TreePart } from './TreeVariant';
import type { VegetationMaterials } from './VegetationMaterials';

/** Agrupa las mallas del GLB por material (una parte instanciable por material). */
/**
 * Los GLB cuantizados (KHR_mesh_quantization) traen posiciones/normales como enteros
 * normalizados y compensan con escala en el nodo. Aplicar esa matriz sobre el atributo
 * entero recorta los valores a ±1 (el árbol queda aplastado en un "bloque"), así que
 * primero se pasan a Float32.
 */
function toFloatAttributes(geo: BufferGeometry): BufferGeometry {
  for (const name of Object.keys(geo.attributes)) {
    const a = geo.getAttribute(name);
    if (a.array instanceof Float32Array && !a.normalized) continue;
    const out = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) out[i * a.itemSize + c] = a.getComponent(i, c);
    geo.setAttribute(name, new BufferAttribute(out, a.itemSize));
  }
  return geo;
}

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
    const geos = meshes.map((m) => toFloatAttributes(m.geometry.clone()).applyMatrix4(m.matrixWorld));
    const geometry = geos.length === 1 ? geos[0]! : mergeGeometries(geos, false)!;
    return { geometry, material: mats.fromModel(material as MeshStandardMaterial, height) };
  });
}

