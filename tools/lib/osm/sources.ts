import type { GeoBBox } from '../../../shared/geo/types';
import type { OsmJson } from './types';

/** Puerto: cualquier origen capaz de devolver los elementos OSM de un bbox. */
export interface OsmDataSource {
  readonly name: string;
  fetchBBox(bbox: GeoBBox): Promise<OsmJson>;
}

export interface FetchAttempt {
  readonly source: string;
  readonly error: string;
}

export interface FetchResult {
  readonly data: OsmJson;
  readonly source: string;
  readonly attempts: readonly FetchAttempt[];
}

/** Prueba las fuentes en orden hasta que una responda con datos (OSM-3). */
export async function fetchWithFallback(sources: readonly OsmDataSource[], bbox: GeoBBox): Promise<FetchResult> {
  const attempts: FetchAttempt[] = [];
  for (const source of sources) {
    try {
      const data = await source.fetchBBox(bbox);
      if (!data.elements?.length) throw new Error('respuesta vacía');
      return { data, source: source.name, attempts };
    } catch (err) {
      attempts.push({ source: source.name, error: err instanceof Error ? err.message : String(err) });
    }
  }
  const detail = attempts.map((a) => `${a.source}: ${a.error}`).join('\n');
  throw new Error(`Ninguna fuente OSM respondió:\n${detail}`);
}
