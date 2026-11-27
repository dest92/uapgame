import { Group, type Camera, type InstancedMesh } from 'three/webgpu';
import { pointInPolygon } from '@shared/geo/polygon';
import type { HeightGrid, HeightSampler } from '@shared/terrain/heightField';
import type { WorldData } from '@shared/world/types';
import type { Texture } from 'three/webgpu';
import { scatterTrees, streetTreePoints, type PlacedTree } from '../../domain/vegetation/scatter';
import type { QualityProfile } from '../../domain/quality/QualityProfiles';
import { buildStreetLamps } from '../props/StreetLamps';
import { createGrassField, heightTexture } from './GrassField';
import { TreeSystem } from './TreeSystem';
import type { TreeVariantProvider } from './TreeVariant';
import type { VegetationMaterials } from './VegetationMaterials';

export interface Vegetation {
  readonly root: Group;
  readonly trees: TreeSystem;
  readonly placed: readonly PlacedTree[];
  readonly lamps: readonly { x: number; z: number }[];
  /** Se recrea al cambiar la calidad (densidad). */
  setGrassDensity(q: QualityProfile): void;
}

const GREEN = new Set(['park', 'garden', 'grass']);
const BLOCKING = new Set(['pitch', 'parking', 'water', 'track', 'plaza', 'sports']);

/** Árboles (OSM + vereda + relleno), pasto y faroles (spec 009). */
export function buildVegetation(
  world: WorldData, terrain: HeightSampler, grid: HeightGrid, splat: Texture, mats: VegetationMaterials, camera: Camera, q: QualityProfile,
  treeProvider: TreeVariantProvider,
): Vegetation {
  const root = new Group();
  root.name = 'vegetation';
  const blockers = [
    ...world.buildings.map((b) => b.footprint),
    ...world.areas.filter((a) => BLOCKING.has(a.kind)).map((a) => a.polygon),
  ];
  const corridors = world.roads.map((r) => ({ points: r.points, width: r.width }));
  const streetSide = streetTreePoints(corridors.filter((_, i) => world.roads[i]!.class === 'road'), 13, 2.2)
    .filter((p) => !blockers.some((b) => pointInPolygon(p, b)));
  const placed = scatterTrees({
    fillAreas: [...world.areas.filter((a) => GREEN.has(a.kind)).map((a) => a.polygon), world.campus.outline],
    blockers,
    corridors,
    fixed: [...world.trees.map((t) => t.position), ...streetSide],
    spacing: q.treeFillSpacing,
    seed: 2026,
  });
  const trees = new TreeSystem(root, placed, terrain, treeProvider, camera);
  const lamps = buildStreetLamps(root, world.roads, terrain, mats);

  const heights = heightTexture(grid);
  let grass: InstancedMesh | null = null;
  const setGrassDensity = (quality: QualityProfile): void => {
    if (grass) {
      root.remove(grass);
      grass.geometry.dispose();
    }
    grass = createGrassField(mats, { radius: quality.grassDistance, heightMap: heights, splat, bounds: world.bounds }, quality.grassDensity);
    root.add(grass);
  };
  setGrassDensity(q);
  return { root, trees, placed, lamps, setGrassDensity };
}
