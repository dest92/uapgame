import type { EnuProjection } from '../../../shared/geo/enu';
import { bboxContains, centroid } from '../../../shared/geo/polygon';
import type { BBox2 } from '../../../shared/geo/types';
import type { PoiData, TreeData, TreeSpecies } from '../../../shared/world/types';
import { pointOf, type OsmFeature } from './features';

const POI_KEYS = ['amenity', 'office', 'shop', 'tourism', 'leisure', 'historic', 'man_made', 'healthcare', 'building'];

/** Árboles de OSM (WLD-8). */
export function buildTree(f: OsmFeature, proj: EnuProjection, bounds: BBox2): TreeData | null {
  if (f.tags['natural'] !== 'tree' || f.geometry.type !== 'Point') return null;
  const position = pointOf(f.geometry, proj, centroid);
  if (!position || !bboxContains(bounds, position)) return null;
  const leaf = f.tags['leaf_type'];
  const genus = (f.tags['genus'] ?? f.tags['species'] ?? '').toLowerCase();
  const species: TreeSpecies =
    leaf === 'needleleaved' || /pinus|cupressus|araucaria/.test(genus) ? 'conifer'
      : /palm|syagrus|phoenix|butia/.test(genus) ? 'palm' : 'broadleaf';
  return { id: f.id, position, species };
}

/** POIs con nombre (sirven para buildings-info y el panel). */
export function buildPoi(f: OsmFeature, proj: EnuProjection, bounds: BBox2): PoiData | null {
  const name = f.tags['name'];
  if (!name || f.tags['highway']) return null;
  const key = POI_KEYS.find((k) => f.tags[k] !== undefined);
  if (!key) return null;
  const position = pointOf(f.geometry, proj, centroid);
  if (!position || !bboxContains(bounds, position)) return null;
  const tags: Record<string, string> = {};
  for (const [k, v] of Object.entries(f.tags)) if (v !== undefined && !k.startsWith('addr:')) tags[k] = v;
  return { id: f.id, name, category: `${key}=${f.tags[key]}`, position, tags };
}
