import type { Surface } from '@shared/world/featureRules';
import { hexToLinear } from '../buildings/color';

/** Albedo base por superficie (sRGB). Los materiales PBR multiplican este tinte. */
const SURFACE_HEX: Readonly<Record<Surface | 'curb', string>> = {
  asphalt: '#4a4b4d',
  paved: '#a39d93',
  concrete: '#b3afa6',
  gravel: '#9a8c78',
  unpaved: '#8a6f52',
  grass: '#5d7a3a',
  curb: '#c2beb5',
};

export const surfaceColor = (s: Surface | 'curb'): [number, number, number] => hexToLinear(SURFACE_HEX[s]);
