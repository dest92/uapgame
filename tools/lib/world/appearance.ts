import type { ReferenceSummary } from '../../../shared/world/reference';
import type { BuildingAppearance, WallMaterial } from '../../../shared/world/types';

const MATERIALS = new Set<WallMaterial>(['brick', 'plaster', 'concrete', 'glass', 'stone', 'metal']);

/** Paleta genérica por tipo de edificio cuando no hay referencias (MAT-1). */
const GENERIC: Readonly<Record<string, Omit<BuildingAppearance, 'source'>>> = {
  house: { wallMaterial: 'plaster', wallColor: '#e4dccb', roofColor: '#8b3f2b', trimColor: '#f3efe6' },
  church: { wallMaterial: 'brick', wallColor: '#9a5a40', roofColor: '#6b3426', trimColor: '#efe8dc' },
  industrial: { wallMaterial: 'concrete', wallColor: '#bdb8ad', roofColor: '#8e9398', trimColor: '#7d8287' },
  dormitory: { wallMaterial: 'plaster', wallColor: '#e2d8c4', roofColor: '#6c6f72', trimColor: '#f5f1e8' },
};
const DEFAULT_GENERIC = { wallMaterial: 'plaster', wallColor: '#ddd5c4', roofColor: '#64686c', trimColor: '#f2eee6' } as const;

const isHex = (v: string | null | undefined): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

export function resolveAppearance(kind: string, ref?: ReferenceSummary): BuildingAppearance {
  const base = GENERIC[kind] ?? DEFAULT_GENERIC;
  if (!ref) return { ...base, source: 'generic' };
  const material = ref.wallMaterial && MATERIALS.has(ref.wallMaterial as WallMaterial)
    ? (ref.wallMaterial as WallMaterial) : undefined;
  const hasAny = material || isHex(ref.wallColor) || isHex(ref.roofColor);
  return {
    wallMaterial: material ?? base.wallMaterial,
    wallColor: isHex(ref.wallColor) ? ref.wallColor : base.wallColor,
    roofColor: isHex(ref.roofColor) ? ref.roofColor : base.roofColor,
    trimColor: isHex(ref.trimColor) ? ref.trimColor : base.trimColor,
    source: hasAny ? 'reference' : 'generic',
  };
}
