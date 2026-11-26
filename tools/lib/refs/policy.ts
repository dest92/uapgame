/**
 * Política de fuentes para referencias fotográficas (spec 012, REF-2).
 * Los términos de Google Maps/Earth/Street View prohíben contenido derivado.
 */
const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /(^|\.)maps\.google\./i,
  /(^|\.)google\.[a-z.]+\/maps/i,
  /(^|\.)maps\.googleapis\.com/i,
  /(^|\.)earth\.google\.com/i,
  /streetviewpixels/i,
  /(^|\.)ggpht\.com/i,
  /googleusercontent\.com\/(p|gps-cs|geougc)/i,
  /googleusercontent\.com\/.*AF1Qip/i,
];

export function isForbiddenSource(url: string): boolean {
  let normalized: string;
  try {
    const u = new URL(url);
    normalized = `${u.hostname}${u.pathname}`;
  } catch {
    return true; // URL inválida: no se puede auditar → se rechaza.
  }
  return FORBIDDEN_PATTERNS.some((re) => re.test(normalized));
}

export interface RefEntry {
  readonly file?: string;
  readonly imageUrl?: string;
  readonly sourcePageUrl?: string;
  readonly author?: string | null;
  readonly license?: string | null;
  readonly accessedAt?: string;
  readonly extracted?: readonly string[];
}

export interface RefsFile {
  readonly osmId?: string;
  readonly name?: string;
  readonly refs?: readonly RefEntry[];
  readonly summary?: Record<string, unknown>;
}

/** Devuelve la lista de problemas de un refs.json (vacía si es válido). */
export function validateRefsFile(file: RefsFile): string[] {
  const problems: string[] = [];
  if (!file.osmId) problems.push('falta osmId');
  (file.refs ?? []).forEach((r, i) => {
    for (const key of ['imageUrl', 'sourcePageUrl', 'accessedAt'] as const) {
      if (!r[key]) problems.push(`refs[${i}]: falta ${key}`);
    }
    for (const key of ['imageUrl', 'sourcePageUrl'] as const) {
      const url = r[key];
      if (url && isForbiddenSource(url)) problems.push(`refs[${i}].${key}: fuente prohibida (${url})`);
    }
  });
  return problems;
}
