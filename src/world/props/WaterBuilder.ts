import { Mesh, ShapeUtils, Vector2, type Group, type Material } from 'three/webgpu';
import type { HeightSampler } from '@shared/terrain/heightField';
import type { AreaData } from '@shared/world/types';
import { emptyGeometry, pushVertex, toBufferGeometry } from '../geometry/GeometryData';

/** Piletas y fuentes (áreas `water`) como superficies planas reflectivas. */
export function buildWater(group: Group, areas: readonly AreaData[], terrain: HeightSampler, material: Material): void {
  const g = emptyGeometry();
  for (const a of areas.filter((x) => x.kind === 'water')) {
    const y = Math.min(...a.polygon.map((p) => terrain.heightAt(p.x, p.z))) + 0.12;
    const tris = ShapeUtils.triangulateShape(a.polygon.map((p) => new Vector2(p.x, -p.z)), []);
    const base = g.positions.length / 3;
    for (const p of a.polygon) pushVertex(g, { p: [p.x, y, p.z], n: [0, 1, 0], uv: [p.x, p.z], color: [1, 1, 1] });
    for (const [i, j, k] of tris) g.indices.push(base + i!, base + j!, base + k!);
  }
  if (!g.indices.length) return;
  const mesh = new Mesh(toBufferGeometry(g), material);
  mesh.name = 'water';
  group.add(mesh);
}
