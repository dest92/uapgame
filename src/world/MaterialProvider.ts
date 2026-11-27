import type { Material, Texture } from 'three/webgpu';
import type { WallMaterial } from '@shared/world/types';

/**
 * Puerto que el mundo usa para pedir materiales por rol. La implementación
 * (materiales PBR/TSL, texturas) vive en la capa de render.
 */
export interface MaterialProvider {
  wall(kind: WallMaterial): Material;
  /** Techos: `color` = tinte, `facade.x` = material (0 tejas, 1 chapa, 2 membrana), `facade.y` = 1 liso. */
  roof(): Material;
  /** Molduras, marcos, alféizares, zócalos (color por vértice). */
  trim(): Material;
  /** Vidrio de ventanas y puertas (`color.r` = semilla por ventana, `color.g` = 1 puerta). */
  glass(): Material;
  road(): Material;
  curb(): Material;
  ground(splat: Texture, worldSize: { width: number; depth: number }): Material;
  water(): Material;
  /** Foto real de fachada (WebP en public/textures/facades). */
  photoFacade(url: string): Material;
}
