/** Formato de data/buildings-info.json (spec 007). */
export interface Sourced {
  readonly value: string | null;
  readonly source: string | null;
}

export interface InfoField {
  readonly label: string;
  readonly value: string;
  /** "OSM way/123", URL de referencia o "manual". */
  readonly source: string;
}

export interface BuildingInfo {
  readonly name: Sourced;
  readonly description: Sourced;
  readonly fields: readonly InfoField[];
  readonly references: readonly string[];
  /** Si es true, el generador no toca esta entrada. */
  readonly manual?: boolean;
}

export interface BuildingInfoFile {
  readonly generatedAt: string;
  readonly note: string;
  readonly buildings: Readonly<Record<string, BuildingInfo>>;
}

