import type { Scene } from 'three/webgpu';
import type { WorldData } from '@shared/world/types';
import type { InputHub } from '../core/input/InputHub';
import type { GameLoop } from '../core/loop/GameLoop';
import type { GameState } from '../core/state/GameState';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { AssetLoader } from '../render/assets/AssetLoader';
import type { SceneContext } from '../render/scene/SceneContext';
import { CameraRig } from '../player/CameraRig';
import { CharacterView } from '../player/CharacterView';
import { CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS, PlayerController } from '../player/PlayerController';
import type { TerrainSampler } from '../world/terrain/terrainSampler';
import { APP_CONFIG } from './config';

export interface PlayerRig {
  readonly controller: PlayerController;
  readonly camera: CameraRig;
}

function spawnPoint(world: WorldData): { x: number; z: number; yaw: number } {
  const b = world.buildings.find((x) => x.id === APP_CONFIG.spawnBuildingId);
  if (!b) return { x: 0, z: 0, yaw: 0 };
  const { position: p, normal: n } = b.entrance;
  // 16 m frente a la entrada, mirando hacia el edificio (encuadre amplio al iniciar).
  return { x: p.x + n.x * 16, z: p.z + n.z * 16, yaw: Math.atan2(-n.x, -n.z) };
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
  const view = new CharacterView(model, anims.animations);
  (ctx.scene as Scene).add(view.root);

  let rig: CameraRig | null = null;
  const controller = new PlayerController(APP_CONFIG.playerEntityId, state, body, input, () => rig?.orbit.yaw ?? 0, (dt) => physics.step(dt));
  rig = new CameraRig(ctx.camera, controller, input, physics, terrain);
  rig.orbit.yaw = spawn.yaw + Math.PI + 0.5;
  rig.orbit.pitch = 0.22;
  rig.orbit.zoom(2.5);

  loop.add(controller).add(rig).add({
    update: (dt, alpha) => {
      const e = state.get(APP_CONFIG.playerEntityId);
      if (!e) return;
      view.play(e.anim);
      view.setSpeed(e.anim, e.speed);
      view.sync(controller.interpolated(alpha), e.yaw, dt);
    },
  });
  return { controller, camera: rig };
}
