import type { GeoPoint } from '../../../shared/geo/types';
import { fetchWithTimeout } from '../http';

export interface CampusLocation {
  /** `way/123` */
  readonly id: string;
  readonly name: string;
  readonly outline: readonly GeoPoint[];
}

interface NominatimResult {
  osm_type: string;
  osm_id: number;
  /** `format=json` usa `class`; `jsonv2` usa `category`. */
  class?: string;
  category?: string;
  type: string;
  name: string;
  geojson?: { type: string; coordinates: unknown };
}

/** Elige el resultado que es una universidad con polígono (OSM-1). */
export function pickCampus(results: readonly NominatimResult[]): CampusLocation {
  const hit = results.find((r) => (r.category ?? r.class) === 'amenity' && r.type === 'university' && r.geojson?.type === 'Polygon');
  if (!hit?.geojson) throw new Error('No se encontró una entidad amenity=university con polígono para el campus');
  const ring = (hit.geojson.coordinates as number[][][])[0] ?? [];
  return {
    id: `${hit.osm_type}/${hit.osm_id}`,
    name: hit.name,
    outline: ring.map(([lon, lat]) => ({ lon: lon!, lat: lat! })),
  };
}

/** Ubica el campus por nombre vía Nominatim (servicio de OSM, ODbL). */
export async function locateCampusByName(name: string): Promise<CampusLocation> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q: name, format: 'jsonv2', polygon_geojson: '1', limit: '10' }).toString();
  const res = await fetchWithTimeout(url.toString(), {}, 30_000);
  return pickCampus((await res.json()) as NominatimResult[]);
}
