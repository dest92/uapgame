import { AnimationMixer, BufferAttribute, LoopOnce, Object3D, SkinnedMesh, type AnimationAction, type AnimationClip, type MeshStandardMaterial } from 'three/webgpu';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { AnimState, Vec3 } from '../core/state/GameState';
import { createClothingMaterial } from '../render/materials/clothingMaterial';
import { dominantBone, regionForBone } from './clothingRegions';

/** Clip de UAL por estado de animación (MOV-5). */
const CLIP_FOR: Readonly<Record<AnimState, string>> = {
  idle: 'Idle_Loop', walk: 'Walk_Loop', jog: 'Jog_Fwd_Loop', run: 'Sprint_Loop', jump: 'Jump_Start', fall: 'Jump_Loop',
};

/** Representación visual del jugador: modelo, ropa y animaciones. Lee estado, no lo escribe. */
export class CharacterView {
  readonly root = new Object3D();
  private readonly mixer: AnimationMixer;
  private readonly actions = new Map<string, AnimationAction>();
  private current: AnimationAction | null = null;

  constructor(model: GLTF, animations: readonly AnimationClip[]) {
    const body = model.scene;
    body.traverse((o) => {
      if (!(o instanceof SkinnedMesh)) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      const mat = o.material as MeshStandardMaterial;
      // El pelo del pack viene en escala de grises para teñirse en el motor.
      if (/Hair/i.test(mat.name)) mat.color.set('#5a3d2b');
      if (/Superhero/i.test(mat.name)) {
        CharacterView.writeRegions(o);
        o.material = createClothingMaterial(mat);
      }
    });
    this.root.add(body);
    this.mixer = new AnimationMixer(body);
    for (const clip of animations) {
      const action = this.mixer.clipAction(clip);
      if (clip.name === 'Jump_Start' || clip.name === 'Jump_Land' || clip.name === 'Interact') {
        action.setLoop(LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(clip.name, action);
    }
    this.play('idle', 0);
  }

  /** Atributo `region` por vértice según el hueso dominante (ver clothingRegions). */
  private static writeRegions(mesh: SkinnedMesh): void {
    const idx = mesh.geometry.getAttribute('skinIndex');
    const w = mesh.geometry.getAttribute('skinWeight');
    const bones = mesh.skeleton.bones;
    const regions = new Float32Array(idx.count);
    for (let i = 0; i < idx.count; i++) {
      const b = dominantBone([idx.getX(i), idx.getY(i), idx.getZ(i), idx.getW(i)], [w.getX(i), w.getY(i), w.getZ(i), w.getW(i)]);
      regions[i] = regionForBone(bones[b]?.name ?? '');
    }
    mesh.geometry.setAttribute('region', new BufferAttribute(regions, 1));
  }

  play(state: AnimState, fade = 0.2): void {
    const next = this.actions.get(CLIP_FOR[state]);
    if (!next || next === this.current) return;
    next.reset().setEffectiveWeight(1).fadeIn(fade).play();
    this.current?.fadeOut(fade);
    this.current = next;
  }

  /** Ajusta la cadencia de las piernas a la velocidad real (evita "patinar"). */
  setSpeed(state: AnimState, speed: number): void {
    const ref = state === 'walk' ? 1.6 : state === 'jog' ? 3.4 : state === 'run' ? 5.5 : 0;
    if (this.current) this.current.timeScale = ref > 0 ? Math.min(1.6, Math.max(0.6, speed / ref)) : 1;
  }

  sync(position: Vec3, yaw: number, dt: number): void {
    this.root.position.set(position.x, position.y, position.z);
    this.root.rotation.y = yaw;
    this.mixer.update(dt);
  }
}
