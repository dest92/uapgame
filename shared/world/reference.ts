/** Resumen extraído de las referencias fotográficas (`reference/web/<osmKey>/refs.json`). */
export interface ReferenceSummary {
  readonly levels?: number | null;
  /** Altura estimada en metros desde fotos (cuando no hay pisos discernibles). */
  readonly height?: number | null;
  readonly roof?: string | null;
  readonly roofColor?: string | null;
  readonly wallMaterial?: string | null;
  readonly wallColor?: string | null;
  readonly trimColor?: string | null;
  readonly windowStyle?: string | null;
  readonly confidence?: 'high' | 'medium' | 'low' | null;
  readonly notes?: string | null;
  /**
   * Acceso principal observado en las fotos (coordenadas del mundo, metros). Reemplaza la entrada
   * estimada desde los caminos de OSM cuando esta cae en una fachada secundaria.
   */
  readonly entrance?: { readonly position: { x: number; z: number }; readonly normal: { x: number; z: number } } | null;
}

export type Tags = Readonly<Record<string, string | undefined>>;

/** Clave estable de un elemento OSM: `way/123` → `way-123` (apta para archivos). */
export const osmKeyToFileKey = (osmKey: string): string => osmKey.replace('/', '-');
