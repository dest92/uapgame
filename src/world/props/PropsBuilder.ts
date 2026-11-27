import { Box3, InstancedMesh, Matrix4, Quaternion, Vector3, type Group } from 'three/webgpu';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { HeightSampler } from '@shared/terrain/heightField';
import type { WorldData } from '@shared/world/types';
import { benchPositions, shrubPositions, type Placement } from '../../domain/props/placement';
import { partsOf } from '../vegetation/modelParts';
import { distanceToPolyline, pointInPolygon } from '@shared/geo/polygon';
import type { VegetationMaterials } from '../vegetation/VegetationMaterials';

/** Arbustos y bancos escaneados: se ven como bloques en algunas GPUs; desactivados hasta validarlos. */
const ENABLE_SCANNED_PROPS = new URLSearchParams(location.search).has('props');

interface PropSpec {
  readonly url: string;
  /** Altura objetivo en metros (los escaneos vienen a escalas distintas). */
  readonly height: number;
  readonly placements: readonly Placement[];
  readonly castShadow: boolean;
}

/** Instancia un modelo glTF en muchas ubicaciones (un draw call por material). */
function instanceModel(group: Group, gltf: GLTF, spec: PropSpec, terrain: HeightSampler, mats: VegetationMaterials): void {
  if (!spec.placements.length) return;
  const size = new Box3().setFromObject(gltf.scene).getSize(new Vector3());
  const base = spec.height / Math.max(size.y, 1e-3);
  const parts = partsOf(gltf, mats, spec.height);
  const m = new Matrix4();
  const up = new Vector3(0, 1, 0);
  for (const part of parts) {
    const mesh = new InstancedMesh(part.geometry, part.material, spec.placements.length);
    spec.placements.forEach((p, i) => {
      const s = base * (0.85 + ((p.x * 3.7 + p.z * 1.3) % 1 + 1) % 1 * 0.3);
      m.compose(new Vector3(p.x, terrain.heightAt(p.x, p.z), p.z), new Quaternion().setFromAxisAngle(up, p.yaw), new Vector3(s, s, s));
      mesh.setMatrixAt(i, m);
    });
    mesh.castShadow = spec.castShadow;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
}

/** Mobiliario escaneado (Poly Haven, CC0): arbustos junto a fachadas y bancos en senderos. */
export async function buildProps(
  group: Group, world: WorldData, terrain: HeightSampler, mats: VegetationMaterials, load: (url: string) => Promise<GLTF>,
): Promise<void> {
  const shrubs = shrubPositions(world.buildings.filter((b) => b.identified).map((b) => ({ footprint: b.footprint, entrance: b.entrance.position })), 3.2, 1.0);
  const half = Math.ceil(shrubs.length / 2);
  const paths = world.roads.filter((r) => r.class === 'path').map((r) => ({ points: r.points, width: r.width }));
  const roads = world.roads.filter((r) => r.class === 'road');
  const hardAreas = world.areas.filter((a) => a.kind === 'parking' || a.kind === 'pitch' || a.kind === 'plaza' || a.kind === 'water');
  const clearOfRoads = (p: Placement): boolean =>
    roads.every((r) => distanceToPolyline(p, r.points) > r.width / 2 + 1.5) && !hardAreas.some((a) => pointInPolygon(p, a.polygon));
  const benches = benchPositions(paths, 45).filter(clearOfRoads);
  const specs: PropSpec[] = [
    // Arbustos escaneados desactivados hasta validarlos en GPU real: en el render por software
    // (sin MSAA) se leen como bloques. Para reactivar: ENABLE_SCANNED_SHRUBS = true.
    ...(ENABLE_SCANNED_PROPS ? [
      { url: 'models/vegetation/shrub_03_lod0.glb', height: 0.9, placements: shrubs.slice(0, half), castShadow: true },
      { url: 'models/vegetation/shrub_04_lod0.glb', height: 1.1, placements: shrubs.slice(half), castShadow: true },
    ] : []),
    ...(ENABLE_SCANNED_PROPS ? [{ url: 'models/vegetation/painted_wooden_bench_lod0.glb', height: 0.89, placements: benches, castShadow: true }] : []),
  ];
  await Promise.all(specs.map(async (spec) => {
    try {
      instanceModel(group, await load(spec.url), spec, terrain, mats);
    } catch (err) {
      console.warn(`[props] no se pudo cargar ${spec.url}`, err);
    }
  }));
}
