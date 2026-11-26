import type { PerspectiveCamera } from 'three/webgpu';
import type { InputHub } from '../core/input/InputHub';
import type { GameSystem } from '../core/loop/GameLoop';
import { OrbitModel } from '../domain/camera/OrbitModel';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { HeightSampler } from '@shared/terrain/heightField';
import type { PlayerController } from './PlayerController';

const EYE_HEIGHT = 1.55;
const SHOULDER = 0.35;

/** Cámara orbital en tercera persona con colisión (spec 006). */
export class CameraRig implements GameSystem {
  readonly orbit = new OrbitModel();

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly player: PlayerController,
    private readonly input: InputHub,
    private readonly physics: PhysicsWorld,
    private readonly terrain: HeightSampler,
  ) {}

  update(dt: number, alpha: number): void {
    const s = this.input.state;
    this.orbit.look(s.lookDX, s.lookDY);
    if (s.zoom) this.orbit.zoom(s.zoom);

    const p = this.player.interpolated(alpha);
    // Objetivo levemente sobre el hombro derecho, estilo cámara "over-the-shoulder".
    const rx = Math.cos(this.orbit.yaw) * SHOULDER;
    const rz = -Math.sin(this.orbit.yaw) * SHOULDER;
    const target = { x: p.x + rx, y: p.y + EYE_HEIGHT, z: p.z + rz };
    const dir = this.orbit.desiredOffset(1);
    const hit = this.physics.raycast(target, dir, this.orbit.distance + 0.5);
    const dist = this.orbit.resolveDistance(hit, dt);
    const off = this.orbit.desiredOffset(dist);
    const cx = target.x + off.x;
    const cz = target.z + off.z;
    const cy = OrbitModel.clampAboveGround(target.y + off.y, this.terrain.heightAt(cx, cz));
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(target.x, target.y, target.z);
  }
}
