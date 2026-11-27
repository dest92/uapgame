/**
 * Mástiles con banderas frente al Pabellón OGDEN: POI OSM "Mástil" (node/3917136178) y foto 02.jpg de
 * way-388510375 (tres mástiles con banderas). Se incluyen en el GLB de OGDEN vía `siteFor`.
 */
import { Vector2 } from 'three';
import type { WorldData } from '@shared/world/types';
import type { HeroBuilder } from '../lib/builder';
import type { MaterialSpec } from '../lib/materials';
import { box, cylinder, flatShape } from '../lib/parts';
import type { Site } from '../lib/site';

export const MASTIL_MATERIALS = {
  poleWhite: { color: '#e9eaea', roughness: 0.35, metalness: 0.7 },
  flagSky: { color: '#74acdf', roughness: 0.8, doubleSided: true },
  flagWhite: { color: '#f4f4f4', roughness: 0.8, doubleSided: true },
  plinth: { color: '#b3afa6', roughness: 0.85, texture: 'concrete', uvScale: 1.5 },
} as const satisfies Record<string, MaterialSpec>;
type F = keyof typeof MASTIL_MATERIALS;
type WithFlags<M extends string> = F extends M ? HeroBuilder<M> : never;

export function flagpoles<M extends string>(host: WithFlags<M>, site: Site, world: WorldData): void {
  const poi = world.pois.find((p) => p.id === 'node/3917136178');
  if (!poi) return;
  const b = site.at(host as unknown as HeroBuilder<F>, poi.position);
  b.add('plinth', box(6.4, 0.9, 1.4, 0, -0.6, 0));
  for (const [x, h] of [[-2.4, 9], [0, 10.5], [2.4, 9]] as const) {
    b.add('poleWhite', cylinder(0.045, 0.08, h, x, 0.3, 0, 10), cylinder(0.09, 0.09, 0.12, x, h + 0.3, 0, 10));
    const stripe = (y: number, mat: F): void => {
      b.add(mat, flatShape([new Vector2(x + 0.1, y), new Vector2(x + 1.9, y), new Vector2(x + 1.9, y + 0.4), new Vector2(x + 0.1, y + 0.4)], 0));
    };
    stripe(h - 0.6, 'flagSky');
    stripe(h - 1.0, 'flagWhite');
    stripe(h - 1.4, 'flagSky');
  }
}
