import { DoubleSide, MeshStandardNodeMaterial, type Material, type Texture } from 'three/webgpu';
import { color, float } from 'three/tsl';
import type { WallMaterial } from '@shared/world/types';
import type { MaterialProvider } from '../../world/MaterialProvider';
import type { TextureLibrary, TextureSetName } from '../textures/TextureLibrary';
import { facadeNodes, type FacadeParams } from './nodes/facadeNode';
import { groundNodes, roadNodes, roofNodes } from './nodes/surfaceNodes';

/** Textura y parámetros de fachada por tipo de pared (derivado de las referencias, MAT-1). */
const WALLS: Readonly<Record<WallMaterial, { set: TextureSetName; params: FacadeParams }>> = {
  brick: { set: 'brick', params: { tile: 2.2, keepTexture: 0.55, textureLuma: 0.22 } },
  plaster: { set: 'plaster', params: { tile: 3, keepTexture: 0, textureLuma: 0.62 } },
  concrete: { set: 'concrete', params: { tile: 3, keepTexture: 0.15, textureLuma: 0.42 } },
  stone: { set: 'concrete', params: { tile: 2, keepTexture: 0.3, textureLuma: 0.42 } },
  glass: { set: 'plaster', params: { tile: 3, keepTexture: 0, textureLuma: 0.62 } },
  metal: { set: 'metal', params: { tile: 2, keepTexture: 0, textureLuma: 0.5 } },
};

/** Materiales PBR + TSL del Hito 3 (texturas CC0 de ambientCG). */
export class PbrMaterialLibrary implements MaterialProvider {
  private readonly cache = new Map<string, Material>();

  constructor(private readonly tex: TextureLibrary) {}

  private cached(key: string, create: () => Material): Material {
    let m = this.cache.get(key);
    if (!m) this.cache.set(key, (m = create()));
    return m;
  }

  wall(kind: WallMaterial): Material {
    return this.cached(`wall:${kind}`, () => {
      const { set, params } = WALLS[kind];
      const n = facadeNodes(this.tex.get(set), params);
      const m = new MeshStandardNodeMaterial({ vertexColors: true });
      m.colorNode = n.color;
      m.roughnessNode = n.roughness;
      m.metalnessNode = n.metalness;
      m.normalNode = n.normal;
      m.emissiveNode = n.emissive;
      return m;
    });
  }

  roof(): Material {
    return this.cached('roof', () => {
      const n = roofNodes(this.tex.get('rooftiles'), this.tex.get('concrete'));
      const m = new MeshStandardNodeMaterial({ vertexColors: true, side: DoubleSide });
      m.colorNode = n.color;
      m.roughnessNode = n.roughness;
      m.normalNode = n.normal;
      return m;
    });
  }

  road(): Material {
    return this.cached('road', () => {
      const n = roadNodes(this.tex.get('asphalt'), this.tex.get('paving'));
      const m = new MeshStandardNodeMaterial({ vertexColors: true });
      m.colorNode = n.color;
      m.roughnessNode = n.roughness;
      m.normalNode = n.normal;
      m.polygonOffset = true;
      m.polygonOffsetFactor = -2;
      m.polygonOffsetUnits = -2;
      return m;
    });
  }

  curb(): Material {
    return this.cached('curb', () => {
      const m = new MeshStandardNodeMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.85 });
      m.map = this.tex.get('concrete').color;
      return m;
    });
  }

  ground(splat: Texture): Material {
    const n = groundNodes({ grass: this.tex.get('grass'), dirt: this.tex.get('dirt'), paving: this.tex.get('paving') }, splat);
    const m = new MeshStandardNodeMaterial();
    m.colorNode = n.color;
    m.roughnessNode = n.roughness;
    m.normalNode = n.normal;
    return m;
  }

  water(): Material {
    return this.cached('water', () => {
      const m = new MeshStandardNodeMaterial();
      m.colorNode = color('#1f5f7a');
      m.roughnessNode = float(0.04);
      m.metalnessNode = float(0.1);
      return m;
    });
  }
}
