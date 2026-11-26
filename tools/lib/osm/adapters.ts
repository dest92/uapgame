import type { GeoBBox } from '../../../shared/geo/types';
import { fetchWithTimeout } from '../http';
import { bboxToOsmApi } from './bbox';
import { buildCampusQuery } from './query';
import type { OsmDataSource } from './sources';
import type { OsmJson } from './types';

export class OverpassSource implements OsmDataSource {
  readonly name: string;
  constructor(private readonly endpoint: string) {
    this.name = `overpass:${new URL(endpoint).host}`;
  }
  async fetchBBox(bbox: GeoBBox): Promise<OsmJson> {
    const res = await fetchWithTimeout(this.endpoint, {
      method: 'POST',
      body: new URLSearchParams({ data: buildCampusQuery(bbox) }),
    }, 100_000);
    return (await res.json()) as OsmJson;
  }
}

/** API oficial OSM 0.6 `/map`: devuelve todo el bbox (apto para áreas chicas). */
export class OsmApiSource implements OsmDataSource {
  readonly name = 'osm-api-0.6';
  constructor(private readonly base = 'https://api.openstreetmap.org/api/0.6') {}
  async fetchBBox(bbox: GeoBBox): Promise<OsmJson> {
    const res = await fetchWithTimeout(`${this.base}/map.json?bbox=${bboxToOsmApi(bbox)}`, {}, 120_000);
    return (await res.json()) as OsmJson;
  }
}
