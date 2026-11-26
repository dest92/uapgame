import { Group, Mesh } from 'three/webgpu';
import type { BuildingData, WallMaterial } from '@shared/world/types';
import type { HeightSampler } from '@shared/terrain/heightField';
import { appendGeometry, emptyGeometry, toBufferGeometry, type GeometryData } from '../geometry/GeometryData';
import type { MaterialProvider } from '../MaterialProvider';
import { buildBuildingGeometry } from './BuildingGeometryBuilder';

export const groundUnder = (b: BuildingData, terrain: HeightSampler): number =>
  Math.min(...b.footprint.map((p) => terrain.heightAt(p.x, p.z)));

/**
 * Genera todos los edificios procedurales y los fusiona por material
 * (un draw call por tipo de pared + uno para techos). Los ids en `skip`
 * (hero assets) no se generan.
 */
export function buildBuildings(
  buildings: readonly BuildingData[], terrain: HeightSampler, materials: MaterialProvider, skip: ReadonlySet<string>,
): Group {
  const walls = new Map<WallMaterial, GeometryData>();
  const roofs = emptyGeometry();
  for (const b of buildings) {
    if (skip.has(b.id)) continue;
    const g = buildBuildingGeometry(b, groundUnder(b, terrain));
    const key = b.appearance.wallMaterial;
    if (!walls.has(key)) walls.set(key, emptyGeometry());
    appendGeometry(walls.get(key)!, g.walls);
    appendGeometry(roofs, g.roof);
  }
  const group = new Group();
  group.name = 'buildings';
  for (const [kind, data] of walls) {
    const mesh = new Mesh(toBufferGeometry(data), materials.wall(kind));
    mesh.name = `walls:${kind}`;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  if (roofs.indices.length) {
    const roof = new Mesh(toBufferGeometry(roofs), materials.roof());
    roof.name = 'roofs';
    roof.castShadow = roof.receiveShadow = true;
    group.add(roof);
  }
  return group;
}
