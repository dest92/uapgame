import type { Scene } from 'three/webgpu';
import type { HeightSampler } from '@shared/terrain/heightField';
import type { EventBus } from '../core/events/EventBus';
import type { GameEvents } from '../core/events/GameEvents';
import type { InputHub } from '../core/input/InputHub';
import type { GameSystem } from '../core/loop/GameLoop';
import { initialBikeState } from '../domain/vehicles/BikeModel';
import type { PlayerController } from '../player/PlayerController';
import { BicycleView } from '../world/props/BicycleView';

const MOUNT_RADIUS = 2.5;
const MAX_BIKES = 5;
const COLORS = ['#1f5fae', '#b8322a', '#2f8a4c', '#d9a21b', '#6b3fa0'];

interface Bike {
  readonly view: BicycleView;
  x: number;
  z: number;
  heading: number;
}

/** Bicicletas (spec 013 VEH-5/6): estacionadas, subir/bajar con F, aparecer con B. */
export class VehicleSystem implements GameSystem {
  private readonly bikes: Bike[] = [];
  private ridden: Bike | null = null;
  private hint: string | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly player: PlayerController,
    private readonly input: InputHub,
    private readonly terrain: HeightSampler,
    private readonly bus: EventBus<GameEvents>,
  ) {}

  /** Agrega una bici estacionada (máximo 5: se recicla la más vieja que no esté en uso). */
  spawn(x: number, z: number, heading: number): void {
    if (this.bikes.length >= MAX_BIKES) {
      const old = this.bikes.findIndex((b) => b !== this.ridden);
      const [removed] = this.bikes.splice(old, 1);
      if (removed) this.scene.remove(removed.view.root);
    }
    const view = new BicycleView(COLORS[this.bikes.length % COLORS.length]);
    this.scene.add(view.root);
    this.bikes.push({ view, x, z, heading });
  }

  private nearest(): Bike | null {
    const p = this.player.feetPosition;
    let best: Bike | null = null;
    let bestD = MOUNT_RADIUS;
    for (const b of this.bikes) {
      const d = Math.hypot(b.x - p.x, b.z - p.z);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  private setHint(text: string | null): void {
    if (text === this.hint) return;
    this.hint = text;
    this.bus.emit('hud:hint', text);
  }

  update(_dt: number, alpha: number): void {
    const p = this.player.feetPosition;
    if (this.input.consumeSpawnBike()) {
      const f = this.player.facing;
      this.spawn(p.x + Math.sin(f) * 2.5, p.z + Math.cos(f) * 2.5, f + Math.PI / 2);
    }
    if (this.input.consumeMount()) {
      if (this.ridden) {
        const state = this.player.dismount();
        const h = state?.heading ?? 0;
        // La bici queda estacionada a la derecha del jugador.
        this.ridden.x = p.x - Math.cos(h) * 0.9;
        this.ridden.z = p.z + Math.sin(h) * 0.9;
        this.ridden.heading = h;
        this.ridden = null;
      } else {
        const b = this.nearest();
        if (b) {
          this.ridden = b;
          this.player.mount(initialBikeState(b.heading));
        }
      }
    }

    for (const b of this.bikes) {
      if (b === this.ridden) continue;
      b.view.sync(b.x, this.terrain.heightAt(b.x, b.z), b.z, b.heading, 0.12, 0);
    }
    const riding = this.player.riding;
    if (this.ridden && riding) {
      const q = this.player.interpolated(alpha);
      this.ridden.x = q.x;
      this.ridden.z = q.z;
      this.ridden.view.sync(q.x, q.y, q.z, riding.heading, riding.lean, riding.wheelAngle);
    }
    this.setHint(this.ridden ? 'F — Bajar de la bici · W/S pedalear/frenar · A/D girar' : this.nearest() ? 'F — Subir a la bici' : null);
  }
}
