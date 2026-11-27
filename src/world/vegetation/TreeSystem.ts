import { InstancedMesh, Matrix4, Quaternion, Vector3, type Camera, type Group } from 'three/webgpu';
import type { TreeSpecies } from '@shared/world/types';
import type { HeightSampler } from '@shared/terrain/heightField';
import type { PlacedTree } from '../../domain/vegetation/scatter';
import type { TreeVariant, TreeVariantProvider } from './TreeVariant';

const SPECIES: readonly TreeSpecies[] = ['broadleaf', 'conifer', 'palm'];
const CULL_DISTANCE = 650;
const REFRESH_SECONDS = 0.35;

interface SpeciesMeshes {
  readonly variant: TreeVariant;
  readonly hi: readonly InstancedMesh[];
  readonly lo: readonly InstancedMesh[];
  readonly trees: readonly { readonly matrix: Matrix4; readonly x: number; readonly z: number }[];
}

/** Árboles instanciados por especie con 2 LODs (VEG-2/3). No sabe de dónde sale la geometría. */
export class TreeSystem {
  private readonly bySpecies = new Map<TreeSpecies, SpeciesMeshes>();
  private timer = 0;
  private readonly tmp = new Vector3();

  constructor(group: Group, trees: readonly PlacedTree[], terrain: HeightSampler, provider: TreeVariantProvider, private readonly camera: Camera) {
    for (const species of SPECIES) {
      const list = trees.filter((t) => t.species === species);
      const variant = provider.variant(species);
      if (!list.length || !variant) continue;
      const make = (lod: 0 | 1): InstancedMesh[] => variant.lods[lod].map((part) => {
        const m = new InstancedMesh(part.geometry, part.material, list.length);
        // Solo el LOD cercano proyecta sombra: los lejanos no aportan y multiplican el costo por cascada.
        m.castShadow = lod === 0;
        m.receiveShadow = true;
        m.frustumCulled = false;
        m.count = 0;
        group.add(m);
        return m;
      });
      const matrices = list.map((t) => {
        const y = terrain.heightAt(t.position.x, t.position.z);
        const rot = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (t.position.x * 13.7 + t.position.z * 7.1) % (Math.PI * 2));
        const s = t.scale * variant.baseScale;
        return { matrix: new Matrix4().compose(new Vector3(t.position.x, y - 0.1, t.position.z), rot, new Vector3(s, s, s)), x: t.position.x, z: t.position.z };
      });
      this.bySpecies.set(species, { variant, hi: make(0), lo: make(1), trees: matrices });
    }
    this.refresh();
  }

  /** Reparte instancias entre LOD alto/bajo según la distancia a la cámara. */
  private refresh(): void {
    const cam = this.camera.getWorldPosition(this.tmp);
    for (const { variant, hi, lo, trees } of this.bySpecies.values()) {
      let nh = 0;
      let nl = 0;
      for (const t of trees) {
        const d = Math.hypot(t.x - cam.x, t.z - cam.z);
        if (d > CULL_DISTANCE) continue;
        const near = d < variant.lodDistance;
        const i = near ? nh++ : nl++;
        for (const m of near ? hi : lo) m.setMatrixAt(i, t.matrix);
      }
      for (const [meshes, n] of [[hi, nh], [lo, nl]] as const) {
        for (const m of meshes) {
          m.count = n;
          m.instanceMatrix.needsUpdate = true;
        }
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
