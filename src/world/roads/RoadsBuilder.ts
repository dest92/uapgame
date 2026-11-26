import { Group, Mesh } from 'three/webgpu';
import type { HeightSampler } from '@shared/terrain/heightField';
import type { RoadData } from '@shared/world/types';
import { appendGeometry, emptyGeometry, toBufferGeometry } from '../geometry/GeometryData';
import type { MaterialProvider } from '../MaterialProvider';
import { buildRoadGeometry } from './RoadGeometryBuilder';

/** Calles y senderos fusionados en 2 mallas (calzada y cordones). */
export function buildRoads(roads: readonly RoadData[], terrain: HeightSampler, materials: MaterialProvider): Group {
  const surface = emptyGeometry();
  const curb = emptyGeometry();
  // Los caminos se dibujan antes que las calles para que estas queden encima en cruces.
  const ordered = [...roads].sort((a, b) => (a.class === b.class ? 0 : a.class === 'path' ? -1 : 1));
  for (const r of ordered) {
    const g = buildRoadGeometry(r, terrain);
    appendGeometry(surface, g.surface);
    appendGeometry(curb, g.curb);
  }
  const group = new Group();
  group.name = 'roads';
  const s = new Mesh(toBufferGeometry(surface), materials.road());
  s.receiveShadow = true;
  s.name = 'road-surface';
  const c = new Mesh(toBufferGeometry(curb), materials.curb());
  c.receiveShadow = c.castShadow = true;
  c.name = 'road-curbs';
  group.add(s, c);
  return group;
}
