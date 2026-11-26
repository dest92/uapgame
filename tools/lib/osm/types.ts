/** Formato JSON de Overpass / API OSM 0.6 (mismo esquema de `elements`). */
export interface OsmElement {
  readonly type: 'node' | 'way' | 'relation';
  readonly id: number;
  readonly lat?: number;
  readonly lon?: number;
  readonly nodes?: readonly number[];
  readonly members?: readonly { type: string; ref: number; role: string }[];
  readonly tags?: Readonly<Record<string, string>>;
}

export interface OsmJson {
  readonly elements: readonly OsmElement[];
}
