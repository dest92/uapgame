import type { Object3D, Scene } from 'three/webgpu';
import type { HeightSampler } from '@shared/terrain/heightField';
import type { BuildingData } from '@shared/world/types';
import type { AssetLoader } from '../../render/assets/AssetLoader';
import { heroPlacement } from './heroPlacement';

/**
 * Reemplaza edificios procedurales por modelos detallados (spec 011). El edificio
 * procedural ya se omitió al generar (`skipBuildings`); acá se carga y ubica el GLB.
 */
export class HeroAssetSystem {
  constructor(private readonly assets: AssetLoader, private readonly scene: Scene, private readonly terrain: HeightSampler) {}

  async load(buildings: readonly BuildingData[], urls: Readonly<Record<string, string>>): Promise<void> {
    await Promise.all(buildings.map(async (b) => {
      const url = urls[b.id.replace('/', '-')];
      if (!url) return;
      try {
        const gltf = await this.assets.loadGltf(import.meta.env.BASE_URL + url);
        const p = heroPlacement(b, this.terrain);
        gltf.scene.position.set(p.x, p.y, p.z);
        gltf.scene.name = `hero:${b.id}`;
        gltf.scene.traverse((o: Object3D) => {
          o.castShadow = true;
          o.receiveShadow = true;
        });
        this.scene.add(gltf.scene);
      } catch (err) {
        console.warn(`[hero] no se pudo cargar ${url}`, err);
      }
    }));
  }
}
