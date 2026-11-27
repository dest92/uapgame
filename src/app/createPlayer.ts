import type { AnimationClip, Scene } from 'three/webgpu';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { WorldData } from '@shared/world/types';
import type { InputHub } from '../core/input/InputHub';
import type { GameLoop } from '../core/loop/GameLoop';
import type { GameState } from '../core/state/GameState';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { AssetLoader } from '../render/assets/AssetLoader';
import type { SceneContext } from '../render/scene/SceneContext';
import { CameraRig } from '../player/CameraRig';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { CharacterView } from '../player/CharacterView';
import { CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS, PlayerController } from '../player/PlayerController';
import type { TerrainSampler } from '../world/terrain/terrainSampler';
import { APP_CONFIG } from './config';

export interface PlayerRig {
  readonly controller: PlayerController;
  readonly camera: CameraRig;
  /** Modelo y clips del personaje (reutilizados por los NPCs). */
  readonly model: GLTF;
  readonly clips: readonly AnimationClip[];
}

/**
 * Encuadre inicial ajustable por URL (capturas de verificación): `spawnDist` (m frente a la entrada),
 * `camYaw` (desvío de la cámara en grados), `camPitch` (rad) y `camZoom`.
 */
function viewParams(): { dist: number; camYaw: number; camPitch: number; camZoom: number } {
  const q = new URLSearchParams(location.search);
  const num = (k: string, d: number): number => (q.has(k) && Number.isFinite(Number(q.get(k))) ? Number(q.get(k)) : d);
  return { dist: num('spawnDist', 9), camYaw: (num('camYaw', 28.6) * Math.PI) / 180, camPitch: num('camPitch', 0.22), camZoom: num('camZoom', 2.5) };
}

function spawnPoint(world: WorldData): { x: number; z: number; yaw: number } {
  const requested = new URLSearchParams(location.search).get('spawn');
  const b = world.buildings.find((x) => x.id === (requested ?? APP_CONFIG.spawnBuildingId));
  if (!b) return { x: 0, z: 0, yaw: 0 };
  const { position: p, normal: n } = b.entrance;
  // Por defecto 9 m (spawnDist en la URL) frente a la entrada, mirando hacia el edificio (encuadre amplio al iniciar).
  const d = viewParams().dist;
  return { x: p.x + n.x * d, z: p.z + n.z * d, yaw: Math.atan2(-n.x, -n.z) };
}

/** Crea el jugador local: estado, física, vista animada y cámara. */
export async function createPlayer(
  deps: { world: WorldData; terrain: TerrainSampler; physics: PhysicsWorld; state: GameState; input: InputHub; assets: AssetLoader; ctx: SceneContext; loop: GameLoop },
): Promise<PlayerRig> {
  const { world, terrain, physics, state, input, assets, ctx, loop } = deps;
  const spawn = spawnPoint(world);
  const groundY = terrain.heightAt(spawn.x, spawn.z);
  const feet = { x: spawn.x, y: groundY + 0.05, z: spawn.z };
  state.spawn({ id: APP_CONFIG.playerEntityId, kind: 'player', position: feet, yaw: spawn.yaw });
  const body = physics.createCharacter({
    position: { x: feet.x, y: feet.y + CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS, z: feet.z }, radius: CAPSULE_RADIUS, halfHeight: CAPSULE_HALF_HEIGHT,
  });

  const base = import.meta.env.BASE_URL;
  const [model, anims] = await Promise.all([assets.loadGltf(base + APP_CONFIG.characterUrl), assets.loadGltf(base + APP_CONFIG.animationsUrl)]);
  // Copia intacta para clonar NPCs (el jugador modifica materiales del original).
  const npcModel = { ...model, scene: cloneSkinned(model.scene) as GLTF['scene'] } as GLTF;
  const view = new CharacterView(model, anims.animations);
  (ctx.scene as Scene).add(view.root);

  let rig: CameraRig | null = null;
  const controller = new PlayerController(APP_CONFIG.playerEntityId, state, body, input, () => rig?.orbit.yaw ?? 0, (dt) => physics.step(dt));
  rig = new CameraRig(ctx.camera, controller, input, physics, terrain);
  const v = viewParams();
  rig.orbit.yaw = spawn.yaw + Math.PI + v.camYaw;
  rig.orbit.pitch = v.camPitch;
  rig.orbit.zoom(v.camZoom);

  loop.add(controller).add(rig).add({
    update: (dt, alpha) => {
      const e = state.get(APP_CONFIG.playerEntityId);
      if (!e) return;
      view.play(e.anim);
      view.setSpeed(e.anim, e.speed);
      const bike = controller.riding;
      view.sync(controller.interpolated(alpha), e.yaw, dt, bike ? 0.42 : 0, bike ? bike.lean : 0);
    },
  });
  return { controller, camera: rig, model: npcModel, clips: anims.animations };
}
