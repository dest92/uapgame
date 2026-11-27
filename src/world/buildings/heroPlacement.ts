import type { HeightSampler } from '@shared/terrain/heightField';
import type { BuildingData } from '@shared/world/types';

/** `way-123` (nombre de archivo) → `way/123` (id OSM). */
export const osmKeyFromFile = (fileKey: string): string => fileKey.replace('-', '/');

/**
 * HERO-2: origen del GLB = centroide del footprint; Y = cota del terreno en el acceso principal
 * (la puerta queda a nivel de vereda). Los modelos traen fundación por debajo de Y = 0 para cubrir
 * el lado bajo cuando el terreno tiene pendiente.
 */
export function heroPlacement(b: BuildingData, terrain: HeightSampler): { x: number; y: number; z: number } {
  const e = b.entrance.position;
  return { x: b.centroid.x, y: terrain.heightAt(e.x, e.z), z: b.centroid.z };
}
