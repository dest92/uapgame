import { InstancedMesh, Matrix4, Quaternion, Vector3, type Camera, type Group } from 'three/webgpu';
import type { TreeSpecies } from '@shared/world/types';
import type { HeightSampler } from '@shared/terrain/heightField';
import type { PlacedTree } from '../../domain/vegetation/scatter';
import { toBufferGeometry } from '../geometry/GeometryData';
import { buildTree } from './TreeGeometry';
import type { VegetationMaterials } from './VegetationMaterials';

const SPECIES: readonly TreeSpecies[] = ['broadleaf', 'conifer', 'palm'];
const LOD_DISTANCE = 75;
const CULL_DISTANCE = 650;
const REFRESH_SECONDS = 0.35;

interface SpeciesMeshes {
  readonly hi: readonly InstancedMesh[];
  readonly lo: readonly InstancedMesh[];
  readonly trees: readonly { readonly matrix: Matrix4; readonly x: number; readonly z: number }[];
}

/** Árboles instanciados por especie con 2 LODs y viento en shader (VEG-2/3). */
export class TreeSystem {
  private readonly bySpecies = new Map<TreeSpecies, SpeciesMeshes>();
  private timer = 0;
  private readonly tmp = new Vector3();

  constructor(group: Group, trees: readonly PlacedTree[], terrain: HeightSampler, mats: VegetationMaterials, private readonly camera: Camera) {
    for (const species of SPECIES) {
      const list = trees.filter((t) => t.species === species);
      if (!list.length) continue;
      const make = (lod: 0 | 1): InstancedMesh[] => {
        const parts = buildTree(species, lod);
        const trunk = new InstancedMesh(toBufferGeometry(parts.trunk), mats.bark(), list.length);
        const leaves = new InstancedMesh(toBufferGeometry(parts.foliage), mats.foliage(species, parts.height), list.length);
        for (const m of [trunk, leaves]) {
          m.castShadow = true;
          m.receiveShadow = true;
          m.frustumCulled = false;
          m.count = 0;
          group.add(m);
        }
        return [trunk, leaves];
      };
      const matrices = list.map((t) => {
        const y = terrain.heightAt(t.position.x, t.position.z);
        const rot = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (t.position.x * 13.7 + t.position.z * 7.1) % (Math.PI * 2));
        const s = t.scale;
        return { matrix: new Matrix4().compose(new Vector3(t.position.x, y, t.position.z), rot, new Vector3(s, s, s)), x: t.position.x, z: t.position.z };
      });
      this.bySpecies.set(species, { hi: make(0), lo: make(1), trees: matrices });
    }
    this.refresh();
  }

  /** Reparte instancias entre LOD alto/bajo según la distancia a la cámara. */
  private refresh(): void {
    const cam = this.camera.getWorldPosition(this.tmp);
    for (const { hi, lo, trees } of this.bySpecies.values()) {
      let nh = 0;
      let nl = 0;
      for (const t of trees) {
        const d = Math.hypot(t.x - cam.x, t.z - cam.z);
        if (d > CULL_DISTANCE) continue;
        const target = d < LOD_DISTANCE ? hi : lo;
        const i = d < LOD_DISTANCE ? nh++ : nl++;
        for (const m of target) m.setMatrixAt(i, t.matrix);
      }
      for (const m of hi) {
        m.count = nh;
        m.instanceMatrix.needsUpdate = true;
      }
      for (const m of lo) {
        m.count = nl;
        m.instanceMatrix.needsUpdate = true;
      }
    }
  }

  update(dt: number): void {
    this.timer += dt;
    if (this.timer < REFRESH_SECONDS) return;
    this.timer = 0;
    this.refresh();
  }
}
