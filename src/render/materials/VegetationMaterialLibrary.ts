import { DoubleSide, MeshStandardNodeMaterial, type Material, type MeshStandardMaterial } from 'three/webgpu';
import {
  attribute, cameraPosition, clamp, color, distance, float, hash, instanceIndex, mix, mod, normalMap, positionLocal,
  sin, smoothstep, step, texture, time, uv, vec2, vec3, vertexColor, cos,
} from 'three/tsl';
import type { FoliageKind } from '../../world/vegetation/foliageTextures';
import { createFoliageTexture } from '../../world/vegetation/foliageTextures';
import type { GrassFieldParams, VegetationMaterials } from '../../world/vegetation/VegetationMaterials';
import type { TextureLibrary } from '../textures/TextureLibrary';
import { sceneUniforms } from './nodes/sharedUniforms';

/** Materiales TSL de árboles, pasto y faroles (VEG-2..4, SKY-3). */
export class VegetationMaterialLibrary implements VegetationMaterials {
  private readonly cache = new Map<string, Material>();

  constructor(private readonly tex: TextureLibrary) {}

  private cached(key: string, create: () => Material): Material {
    let m = this.cache.get(key);
    if (!m) this.cache.set(key, (m = create()));
    return m;
  }

  bark(): Material {
    return this.cached('bark', () => {
      const set = this.tex.get('bark');
      const tuv = uv().div(vec2(1.2, 1.6));
      const m = new MeshStandardNodeMaterial();
      m.colorNode = texture(set.color, tuv).rgb.mul(0.85);
      m.normalNode = normalMap(texture(set.normal, tuv));
      m.roughnessNode = float(0.92);
      return m;
    });
  }

  foliage(kind: FoliageKind, treeHeight: number): Material {
    return this.cached(`foliage:${kind}:${treeHeight.toFixed(1)}`, () => {
      const map = createFoliageTexture(kind);
      const m = new MeshStandardNodeMaterial({ side: DoubleSide, alphaTest: 0.45, transparent: false });
      const leaf = texture(map, uv());
      const phase = hash(instanceIndex).mul(6.283);
      const h = positionLocal.y.div(treeHeight).clamp(0, 1);
      const amp = h.mul(h).mul(kind === 'palm' ? 0.35 : 0.22).mul(sceneUniforms.wind);
      const sway = vec3(sin(time.mul(1.1).add(phase)), 0, cos(time.mul(0.9).add(phase.mul(1.3)))).mul(amp)
        .add(vec3(sin(time.mul(4.3).add(positionLocal.x.mul(3))).mul(0.03).mul(h), 0, 0));
      m.positionNode = positionLocal.add(sway);
      const shade = mix(float(0.62), float(1.12), h);
      m.colorNode = leaf.rgb.mul(vertexColor().rgb).mul(shade).mul(mix(float(0.5), float(0.62), hash(instanceIndex.add(7))));
      m.opacityNode = leaf.a;
      m.roughnessNode = float(0.95);
      return m;
    });
  }

  fromModel(src: MeshStandardMaterial, treeHeight: number): Material {
    const key = `model:${src.uuid}`;
    return this.cached(key, () => {
      const leaves = src.alphaTest > 0 || src.transparent || /leaf|leaves/i.test(src.name);
      const m = new MeshStandardNodeMaterial({ side: leaves ? DoubleSide : src.side, alphaTest: leaves ? 0.5 : 0 });
      m.map = src.map;
      // En hojas recortadas y de doble cara el normal map produce reversos muy claros: se omite.
      m.normalMap = leaves ? null : src.normalMap;
      if (leaves) m.color.setScalar(0.78);
      m.roughnessMap = src.roughnessMap;
      m.metalnessMap = src.metalnessMap;
      m.aoMap = src.aoMap;
      m.roughness = src.roughness;
      m.metalness = src.metalness;
      if (leaves) {
        const phase = hash(instanceIndex).mul(6.283);
        const h = positionLocal.y.div(treeHeight).clamp(0, 1);
        const amp = h.mul(h).mul(0.35).mul(sceneUniforms.wind);
        m.positionNode = positionLocal.add(vec3(sin(time.mul(0.9).add(phase)), 0, cos(time.mul(0.7).add(phase))).mul(amp)
          .add(vec3(sin(time.mul(5.1).add(positionLocal.x.mul(4))).mul(0.04).mul(h), 0, 0)));
      }
      return m;
    });
  }

  grass(p: GrassFieldParams): Material {
    const m = new MeshStandardNodeMaterial({ side: DoubleSide });
    const off = attribute('grassOffset', 'vec4');
    const R = float(p.radius);
    const camXZ = cameraPosition.xz;
    // Envolvente toroidal: cada mata queda fija en el mundo mientras la cámara se mueve.
    const wrapped = camXZ.add(mod(off.xy.sub(camXZ).add(R), R.mul(2))).sub(R);
    const size = vec2(p.bounds.maxX - p.bounds.minX, p.bounds.maxZ - p.bounds.minZ);
    const tuv = wrapped.sub(vec2(p.bounds.minX, p.bounds.minZ)).div(size);
    const ground = texture(p.heightMap, tuv).level(float(0)).r;
    const s = texture(p.splat, tuv).level(float(0));
    const mask = clamp(s.r.mul(1.25).sub(s.b.mul(2.5)).sub(s.g.mul(0.9)), 0, 1);
    const fade = float(1).sub(smoothstep(R.mul(0.65), R, distance(wrapped, camXZ)));
    const visible = step(off.z, mask).mul(fade);
    const tall = mix(float(0.42), float(0.2), s.r).mul(off.w.mul(0.6).add(0.7));
    const t = positionLocal.y;
    const ang = off.w.mul(6.283);
    const local = vec3(
      positionLocal.x.mul(cos(ang)).sub(positionLocal.z.mul(sin(ang))),
      t.mul(tall),
      positionLocal.x.mul(sin(ang)).add(positionLocal.z.mul(cos(ang))),
    ).mul(visible);
    const gust = sin(time.mul(1.6).add(wrapped.x.mul(0.13)).add(wrapped.y.mul(0.09))).mul(0.09)
      .add(sin(time.mul(3.7).add(off.w.mul(12))).mul(0.03)).mul(sceneUniforms.wind);
    const bend = vec3(gust, 0, gust.mul(0.6)).mul(t.mul(t)).mul(visible);
    m.positionNode = vec3(wrapped.x, ground, wrapped.y).add(local).add(bend);
    const base = mix(color('#2f4718'), color('#4d6b25'), s.r);
    const tip = mix(color('#b3a865'), color('#8fae4c'), s.r);
    m.colorNode = mix(base, tip, uv().y).mul(off.w.mul(0.3).add(0.85));
    m.roughnessNode = float(0.85);
    return m;
  }

  lampPole(): Material {
    return this.cached('lampPole', () => {
      const m = new MeshStandardNodeMaterial({ roughness: 0.55, metalness: 0.7 });
      m.colorNode = color('#2c2f33');
      return m;
    });
  }

  lampHead(): Material {
    return this.cached('lampHead', () => {
      const m = new MeshStandardNodeMaterial({ roughness: 0.3 });
      m.colorNode = color('#e9e4d8');
      m.emissiveNode = color('#ffcf8a').mul(sceneUniforms.night.mul(9));
      return m;
    });
  }
}
