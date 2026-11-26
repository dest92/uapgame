import { OsmApiSource, OverpassSource } from './adapters';
import type { OsmDataSource } from './sources';

/** Orden de preferencia (OSM-3). Ninguna fuente de Google (OSM-6). */
export const DEFAULT_SOURCES: readonly OsmDataSource[] = [
  new OverpassSource('https://overpass-api.de/api/interpreter'),
  new OverpassSource('https://overpass.kumi.systems/api/interpreter'),
  new OverpassSource('https://overpass.private.coffee/api/interpreter'),
  new OsmApiSource(),
];
