/** Resumen extraído de las referencias fotográficas (`reference/web/<osmKey>/refs.json`). */
export interface ReferenceSummary {
  readonly levels?: number | null;
  readonly roof?: string | null;
  readonly roofColor?: string | null;
  readonly wallMaterial?: string | null;
  readonly wallColor?: string | null;
  readonly trimColor?: string | null;
  readonly windowStyle?: string | null;
  readonly confidence?: 'high' | 'medium' | 'low' | null;
  readonly notes?: string | null;
}

export type Tags = Readonly<Record<string, string | undefined>>;

/** Clave estable de un elemento OSM: `way/123` → `way-123` (apta para archivos). */
export const osmKeyToFileKey = (osmKey: string): string => osmKey.replace('/', '-');
