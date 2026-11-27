/**
 * Ubica elementos del entorno (fuentes, canchas, mástiles) dentro del GLB de un edificio vecino:
 * coordenadas del mundo → marco del modelo (origen = centroide, Y = 0 a la cota del acceso), con la
 * diferencia de terreno resuelta en build (el terreno del IGN está suavizado, alcanza con un offset por pieza).
 */
import type { Vec2 } from '@shared/geo/types';
import { HeightField } from '@shared/terrain/heightField';
import type { BuildingData, WorldData } from '@shared/world/types';
import type { HeroBuilder } from './builder';

export interface Site {
  /** Sub-builder con origen en el punto del mundo `p`, apoyado en el terreno y con +X local = `tangent`. */
  at<M extends string>(b: HeroBuilder<M>, p: Vec2, tangent?: Vec2): HeroBuilder<M>;
  /** Cota del terreno en `p` relativa al nivel del acceso del edificio. */
  dy(p: Vec2): number;
}

export function siteFor(bd: BuildingData, world: WorldData): Site {
  const grid = world.terrain.grid;
  const terrain = grid ? new HeightField(grid) : HeightField.flat();
  const base = terrain.heightAt(bd.entrance.position.x, bd.entrance.position.z);
  const dy = (p: Vec2): number => terrain.heightAt(p.x, p.z) - base;
  return {
    dy,
    at: (b, p, tangent = { x: 1, z: 0 }) => b.at({
      origin: { x: p.x - bd.centroid.x, z: p.z - bd.centroid.z },
      tangent,
      normal: { x: -tangent.z, z: tangent.x },
    }, dy(p)),
  };
}
