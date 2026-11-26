import type { ReferenceSummary, Tags } from './reference';

export const LEVEL_HEIGHT = 3.2;

export type HeightSource = 'tag' | 'levels' | 'reference' | 'default';
export type RoofShape = 'flat' | 'gabled' | 'hipped' | 'pyramidal' | 'dome';

export interface HeightInfo {
  readonly height: number;
  readonly minHeight: number;
  readonly levels: number;
  readonly source: HeightSource;
}

/** Parsea números OSM ("12", "12.5 m", "12,5"); devuelve undefined si no es > 0. */
export function parsePositive(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number.parseFloat(value.replace(',', '.').replace(/\s*m$/i, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

interface TypeDefault {
  readonly levels: number;
  readonly levelHeight: number;
  readonly height?: number;
}

const TYPE_DEFAULTS: Readonly<Record<string, TypeDefault>> = {
  house: { levels: 1, levelHeight: LEVEL_HEIGHT },
  residential: { levels: 1, levelHeight: LEVEL_HEIGHT },
  garage: { levels: 1, levelHeight: 3 },
  shed: { levels: 1, levelHeight: 2.8 },
  industrial: { levels: 2, levelHeight: 4.5 },
  warehouse: { levels: 2, levelHeight: 4.5 },
  church: { levels: 1, levelHeight: 9, height: 9 },
  dormitory: { levels: 3, levelHeight: LEVEL_HEIGHT },
};
const GENERIC_DEFAULT: TypeDefault = { levels: 2, levelHeight: LEVEL_HEIGHT };

export function resolveHeight(tags: Tags, ref?: ReferenceSummary): HeightInfo {
  const minHeight =
    parsePositive(tags['min_height']) ??
    (parsePositive(tags['building:min_level']) ?? 0) * LEVEL_HEIGHT;
  const explicit = parsePositive(tags['height']);
  const levels = parsePositive(tags['building:levels']);

  if (explicit !== undefined) {
    return { height: explicit, minHeight, levels: levels ?? Math.max(1, Math.round(explicit / LEVEL_HEIGHT)), source: 'tag' };
  }
  if (levels !== undefined) {
    return { height: levels * LEVEL_HEIGHT, minHeight, levels, source: 'levels' };
  }
  const refLevels = ref?.levels ?? undefined;
  if (refLevels !== undefined && refLevels > 0) {
    return { height: ref?.height ?? refLevels * LEVEL_HEIGHT, minHeight, levels: refLevels, source: 'reference' };
  }
  const refHeight = ref?.height ?? undefined;
  if (refHeight !== undefined && refHeight > 0) {
    return { height: refHeight, minHeight, levels: Math.max(1, Math.round(refHeight / LEVEL_HEIGHT)), source: 'reference' };
  }
  const d = TYPE_DEFAULTS[tags['building'] ?? ''] ?? GENERIC_DEFAULT;
  return { height: d.height ?? d.levels * d.levelHeight, minHeight, levels: d.levels, source: 'default' };
}

const ROOF_ALIASES: Readonly<Record<string, RoofShape>> = {
  flat: 'flat',
  gabled: 'gabled',
  gable: 'gabled',
  hipped: 'hipped',
  hip: 'hipped',
  pyramidal: 'pyramidal',
  dome: 'dome',
  onion: 'dome',
  'half-hipped': 'hipped',
  skillion: 'gabled',
};
const PITCHED_BY_DEFAULT = new Set(['house', 'church', 'chapel', 'residential', 'shed', 'garage']);

export interface RoofInfo {
  readonly shape: RoofShape;
  readonly height: number;
}

export function resolveRoof(tags: Tags, wallHeight: number, ref?: ReferenceSummary): RoofInfo {
  const shape =
    ROOF_ALIASES[tags['roof:shape'] ?? ''] ??
    ROOF_ALIASES[ref?.roof ?? ''] ??
    (PITCHED_BY_DEFAULT.has(tags['building'] ?? '') ? 'gabled' : 'flat');
  if (shape === 'flat') return { shape, height: 0 };
  const explicit = parsePositive(tags['roof:height']);
  const height = explicit ?? Math.min(5, Math.max(1.5, wallHeight * 0.35));
  return { shape, height };
}

export interface NameInfo {
  readonly name: string;
  readonly identified: boolean;
}

const PLACEHOLDER_NAMES = new Set(['nn', 's/n', 'sin nombre', '?']);

export function resolveName(tags: Tags, osmKey: string): NameInfo {
  const raw = tags['name']?.trim();
  if (raw && !PLACEHOLDER_NAMES.has(raw.toLowerCase())) return { name: raw, identified: true };
  const [type, id] = osmKey.split('/');
  return { name: `Edificio sin identificar (OSM ${type} ${id})`, identified: false };
}
