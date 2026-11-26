import type { HeightSampler } from '@shared/terrain/heightField';
import type { BuildingData } from '@shared/world/types';
import { groundUnder } from './BuildingsBuilder';

/** `way-123` (nombre de archivo) → `way/123` (id OSM). */
export const osmKeyFromFile = (fileKey: string): string => fileKey.replace('-', '/');

/** HERO-2: origen del GLB = centroide del footprint, base en el punto más bajo del terreno. */
export function heroPlacement(b: BuildingData, terrain: HeightSampler): { x: number; y: number; z: number } {
  return { x: b.centroid.x, y: groundUnder(b, terrain), z: b.centroid.z };
}
