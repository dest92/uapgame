import { Group, LOD, Mesh, type Material } from 'three/webgpu';
import type { BuildingData, WallMaterial } from '@shared/world/types';
import type { HeightSampler } from '@shared/terrain/heightField';
import { appendGeometry, emptyGeometry, toBufferGeometry, type GeometryData } from '../geometry/GeometryData';
import type { MaterialProvider } from '../MaterialProvider';
import { buildBuildingGeometry } from './BuildingGeometryBuilder';
import { photoFacadeGeometry } from './photoFacade';

export const groundUnder = (b: BuildingData, terrain: HeightSampler): number =>
  Math.min(...b.footprint.map((p) => terrain.heightAt(p.x, p.z)));

/** Distancia (desde la pared más cercana) hasta la que se ve la geometría de fachada. */
export const NEAR_DISTANCE = 60;
const CELL = 72;

/** Agrupa por clave de material; un Mesh (un draw call) por clave y celda. */
class Buckets<K extends string> {
  private readonly map = new Map<K, GeometryData>();
  add(key: K, g: GeometryData): void {
    if (!g.indices.length) return;
    if (!this.map.has(key)) this.map.set(key, emptyGeometry());
    appendGeometry(this.map.get(key)!, g);
  }
  meshes(material: (k: K) => Material, name: string, shadows = true): Mesh[] {
    return [...this.map].map(([k, data]) => {
      const m = new Mesh(toBufferGeometry(data), material(k));
      m.name = `${name}:${k}`;
      m.castShadow = shadows;
      m.receiveShadow = true;
      return m;
    });
  }
}

interface Cell {
  readonly near: Buckets<string>;
  readonly far: Buckets<WallMaterial>;
  cx: number;
  cz: number;
  radius: number;
  readonly members: BuildingData[];
}

/**
 * Genera los edificios procedurales (los ids en `skip` son hero assets).
 * - Siempre: techos y molduras (zócalo, cornisa, pilastras, marquesina), fusionados por material.
 * - Por celda de ~72 m, un `LOD`: cerca = muros con vanos reales, marcos, vidrio (FAC-*);
 *   lejos = muros planos con ventanas pintadas por shader. Ambos salen de la misma gramática.
 */
export function buildBuildings(
  buildings: readonly BuildingData[], terrain: HeightSampler, materials: MaterialProvider, skip: ReadonlySet<string>,
  photos: ReadonlyMap<string, string> = new Map(),
): Group {
  const always = new Buckets<string>();
  const cells = new Map<string, Cell>();
  for (const b of buildings) {
    if (skip.has(b.id)) continue;
    const key = `${Math.floor(b.centroid.x / CELL)},${Math.floor(b.centroid.z / CELL)}`;
    if (!cells.has(key)) cells.set(key, { near: new Buckets(), far: new Buckets(), cx: 0, cz: 0, radius: 0, members: [] });
    cells.get(key)!.members.push(b);
  }
  const group = new Group();
  group.name = 'buildings';
  for (const cell of cells.values()) {
    const pts = cell.members.flatMap((b) => b.footprint);
    cell.cx = (Math.min(...pts.map((p) => p.x)) + Math.max(...pts.map((p) => p.x))) / 2;
    cell.cz = (Math.min(...pts.map((p) => p.z)) + Math.max(...pts.map((p) => p.z))) / 2;
    cell.radius = Math.max(...pts.map((p) => Math.hypot(p.x - cell.cx, p.z - cell.cz)));
    for (const b of cell.members) {
      const ground = groundUnder(b, terrain);
      const doorGround = terrain.heightAt(b.entrance.position.x, b.entrance.position.z);
      const g = buildBuildingGeometry(b, ground, doorGround);
      const kind = b.appearance.wallMaterial;
      cell.far.add(kind, g.far);
      cell.near.add(`wall-${kind}`, g.walls === g.far ? emptyGeometry() : g.walls);
      cell.near.add('trim', g.trim);
      cell.near.add('glass', g.glass);
      always.add('roof', g.roof);
      always.add('trim', g.trimAlways);
    }
    const lod = new LOD();
    lod.name = `buildings-cell:${cell.members.map((b) => b.id).join(',')}`;
    lod.position.set(cell.cx, 0, cell.cz);
    const level = (meshes: Mesh[]): Group => {
      const lg = new Group();
      for (const m of meshes) {
        m.position.set(-cell.cx, 0, -cell.cz);
        lg.add(m);
      }
      return lg;
    };
    const nearMat = (k: string): Material =>
      k === 'trim' ? materials.trim() : k === 'glass' ? materials.glass() : materials.wall(k.slice(5) as WallMaterial);
    lod.addLevel(level(cell.near.meshes(nearMat, 'near')), 0);
    // Las fotos de fachada solo a distancia: de cerca manda la geometría real.
    const photoMeshes = cell.members.filter((b) => photos.has(b.id)).map((b) => {
      const photo = new Mesh(toBufferGeometry(photoFacadeGeometry(b, groundUnder(b, terrain))), materials.photoFacade(photos.get(b.id)!));
      photo.name = `photo:${b.id}`;
      photo.receiveShadow = true;
      return photo;
    });
    lod.addLevel(level([...cell.far.meshes((k) => materials.wall(k), 'walls'), ...photoMeshes]), NEAR_DISTANCE + cell.radius);
    group.add(lod);
  }
  for (const m of always.meshes((k) => (k === 'roof' ? materials.roof() : materials.trim()), 'buildings')) group.add(m);
  return group;
}
