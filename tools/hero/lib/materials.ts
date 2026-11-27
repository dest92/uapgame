import type { ProcTextureName } from './proctex';
/**
 * Paleta PBR de los hero assets. Cada material puede llevar una textura CC0 de ambientCG
 * (normalizada a un "detalle" de brillo medio fijo) que se tiñe con `color`.
 */

/**
 * Texturas de detalle de los hero assets: sets CC0 de ambientCG o, con `proc`, generadas por texel en
 * tools/hero/lib/proctex.ts (ladrillo con juntas, laja irregular, revoque con manchas). Ver CREDITS.md.
 */
export const HERO_TEXTURES: Readonly<Record<'plaster' | 'concrete' | 'stone' | 'brick' | 'paving' | 'tiles' | 'plazaTiles', HeroTextureSpec>> = {
  plaster: { asset: 'PaintedPlaster017', proc: 'plaster', size: 512, normal: true, grey: true, contrast: 0.8 },
  concrete: { asset: 'Concrete034', size: 512, normal: false, grey: true, contrast: 0.8 },
  stone: { asset: 'Bricks099', proc: 'flagstone', size: 512, normal: true, grey: false, contrast: 1.1 },
  brick: { asset: 'Bricks097', proc: 'brick', size: 512, normal: true, grey: false, contrast: 1 },
  paving: { asset: 'PavingStones130', size: 512, normal: true, grey: true, contrast: 1 },
  plazaTiles: { asset: '', proc: 'plazaTiles', size: 512, normal: true, grey: true, contrast: 0.7 },
  tiles: { asset: 'RoofingTiles006', size: 512, normal: true, grey: false, contrast: 1 },
};

export type HeroTexture = keyof typeof HERO_TEXTURES;
export interface HeroTextureSpec {
  readonly asset: string;
  readonly proc?: ProcTextureName;
  readonly size: number;
  readonly normal: boolean;
  readonly grey: boolean;
  readonly contrast: number;
}

export interface MaterialSpec {
  /** Color sRGB final (la textura se normaliza para que su media dé este color). */
  readonly color: string;
  readonly roughness: number;
  readonly metalness?: number;
  readonly texture?: HeroTexture;
  /** Metros que cubre una repetición de la textura. */
  readonly uvScale?: number;
  readonly emissive?: string;
  readonly doubleSided?: boolean;
  /** Variación de tono por pieza (0 = ninguna); por defecto 0.05 en materiales con textura. */
  readonly variation?: number;
}

/** Materiales comunes; cada edificio puede sumar los suyos. */
export const BASE_MATERIALS = {
  plasterWhite: { color: '#eeebe3', roughness: 0.92, texture: 'plaster', uvScale: 3 },
  plasterSand: { color: '#d4bf98', roughness: 0.92, texture: 'plaster', uvScale: 3 },
  concreteWhite: { color: '#e6e4de', roughness: 0.85, texture: 'concrete', uvScale: 2 },
  concreteGrey: { color: '#a9aaa8', roughness: 0.9, texture: 'concrete', uvScale: 2 },
  roofMembrane: { color: '#8d8f8f', roughness: 0.95, texture: 'concrete', uvScale: 4 },
  glassDark: { color: '#18202c', roughness: 0.12, metalness: 0.1 },
  glassBlue: { color: '#1b3050', roughness: 0.12, metalness: 0.1 },
  aluminium: { color: '#c9ccce', roughness: 0.35, metalness: 0.9 },
  aluminiumDark: { color: '#2d3033', roughness: 0.4, metalness: 0.8 },
  bronze: { color: '#a8814c', roughness: 0.4, metalness: 0.75 },
  steelGrey: { color: '#6f7477', roughness: 0.5, metalness: 0.7 },
} as const satisfies Record<string, MaterialSpec>;

/** sRGB [0..1] → lineal. */
export const srgbToLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** '#rrggbb' → componentes lineales [r, g, b]. */
export function hexToLinear(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Color inválido: ${hex}`);
  const n = parseInt(m[1]!, 16);
  return [srgbToLinear(((n >> 16) & 255) / 255), srgbToLinear(((n >> 8) & 255) / 255), srgbToLinear((n & 255) / 255)];
}

/** Brillo medio (sRGB 0..255) al que se normalizan las texturas de detalle. */
export const DETAIL_MEAN = 230;

/**
 * Factor base (lineal) para que textura normalizada × factor ≈ color pedido.
 * Se recorta a 1: los colores más claros que la media de la textura quedan algo más oscuros.
 */
export function baseFactorFor(color: string, textured: boolean): [number, number, number, number] {
  const [r, g, b] = hexToLinear(color);
  if (!textured) return [r, g, b, 1];
  const k = 1 / srgbToLinear(DETAIL_MEAN / 255);
  return [Math.min(1, r * k), Math.min(1, g * k), Math.min(1, b * k), 1];
}
