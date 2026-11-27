import { DoubleSide, MeshStandardNodeMaterial, TextureLoader, type Material, type Texture } from 'three/webgpu';
import { color, mix, texture, uv } from 'three/tsl';
import type { WallMaterial } from '@shared/world/types';
import type { MaterialProvider } from '../../world/MaterialProvider';

/**
 * Materiales del Hito 1: PBR simple con tinte por vértice. El Hito 3 los
 * reemplaza por `PbrMaterialLibrary` (texturas CC0 + shaders TSL) sin tocar el mundo.
 */
export class BasicMaterialLibrary implements MaterialProvider {
  private readonly cache = new Map<string, Material>();

  private cached(key: string, create: () => Material): Material {
    let m = this.cache.get(key);
    if (!m) this.cache.set(key, (m = create()));
    return m;
  }

  wall(kind: WallMaterial): Material {
    return this.cached(`wall:${kind}`, () => new MeshStandardNodeMaterial({
      vertexColors: true, roughness: kind === 'glass' ? 0.15 : 0.85, metalness: kind === 'metal' ? 0.6 : 0,
    }));
  }

  roof(): Material {
    return this.cached('roof', () => new MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.75, side: DoubleSide }));
  }

  road(): Material {
    return this.cached('road', () => {
      const m = new MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.92 });
      m.polygonOffset = true;
      m.polygonOffsetFactor = -2;
      m.polygonOffsetUnits = -2;
      return m;
    });
  }

  curb(): Material {
    return this.cached('curb', () => new MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.8 }));
  }

  ground(splat: Texture): Material {
    const m = new MeshStandardNodeMaterial({ roughness: 0.95 });
    const s = texture(splat, uv());
    const wild = color('#7a7a45');
    const lawn = color('#4f6e2c');
    const dirt = color('#8a6d4e');
    const paved = color('#9d978d');
    let c = mix(wild, lawn, s.r);
    c = mix(c, dirt, s.g);
    c = mix(c, paved, s.b);
    m.colorNode = c;
    return m;
  }

  photoFacade(url: string): Material {
    return this.cached(`photo:${url}`, () => new MeshStandardNodeMaterial({ map: new TextureLoader().load(url), roughness: 0.85 }));
  }

  water(): Material {
    return this.cached('water', () => new MeshStandardNodeMaterial({ color: '#2f6f8f', roughness: 0.05, metalness: 0.1 }));
  }
}
