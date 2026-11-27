import type { InputHub } from '../core/input/InputHub';
import type { GameSystem } from '../core/loop/GameLoop';
import type { GameState, Vec3 } from '../core/state/GameState';
import { MovementModel, initialMoveState, type MoveState } from '../domain/player/MovementModel';
import { BikeModel, type BikeState } from '../domain/vehicles/BikeModel';
import type { CharacterBody } from '../physics/PhysicsWorld';

/** Altura del centro de la cápsula sobre los pies. */
export const CAPSULE_HALF_HEIGHT = 0.55;
export const CAPSULE_RADIUS = 0.3;
const FOOT_OFFSET = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS;

/**
 * Simulación del jugador a paso fijo: input → MovementModel → character
 * controller → GameState. Guarda la posición previa para interpolar el render.
 */
export class PlayerController implements GameSystem {
  private move: MoveState;
  private readonly model = new MovementModel();
  private readonly bikeModel = new BikeModel();
  /** Estado de la bici si el jugador está montado (VEH-5). */
  private bike: BikeState | null = null;
  private prev: Vec3;
  private curr: Vec3;

  constructor(
    private readonly entityId: string,
    private readonly state: GameState,
    private readonly body: CharacterBody,
    private readonly input: InputHub,
    private readonly cameraYaw: () => number,
    private readonly stepPhysics: (dt: number) => void,
  ) {
    this.curr = this.prev = this.feet();
    // Respeta la orientación con la que se creó la entidad.
    this.move = { ...initialMoveState(), yaw: state.get(entityId)?.yaw ?? 0 };
  }

  private feet(): Vec3 {
    const p = this.body.position;
    return { x: p.x, y: p.y - FOOT_OFFSET, z: p.z };
  }

  get riding(): BikeState | null {
    return this.bike;
  }

  get feetPosition(): Vec3 {
    return this.curr;
  }

  get facing(): number {
    return this.move.yaw;
  }

  mount(bike: BikeState): void {
    this.bike = bike;
  }

  /** Baja de la bici y devuelve su estado (para dejarla estacionada). */
  dismount(): BikeState | null {
    const b = this.bike;
    this.bike = null;
    if (b) this.move = { ...initialMoveState(), yaw: b.heading, grounded: true };
    return b;
  }

  private rideStep(dt: number): void {
    const m = this.input.movement();
    const r = this.bikeModel.step(this.bike!, { throttle: m.moveY, steer: m.moveX, sprint: m.run }, dt);
    const moved = this.body.move({ x: r.displacement.x, y: -2 * dt, z: r.displacement.z });
    this.stepPhysics(dt);
    // Si choca, la velocidad cae (la bici no atraviesa paredes ni sigue empujando).
    const p0 = this.curr;
    this.prev = p0;
    this.curr = this.feet();
    const real = Math.hypot(this.curr.x - p0.x, this.curr.z - p0.z) / dt;
    const speed = Math.abs(r.state.speed) > real + 0.5 ? Math.sign(r.state.speed) * real : r.state.speed;
    this.bike = { ...r.state, speed };
    void moved;
    this.state.update(this.entityId, { position: this.curr, yaw: r.state.heading, speed: Math.abs(speed), anim: 'ride' });
    this.state.tick();
  }

  fixedUpdate(dt: number): void {
    if (this.bike) {
      this.input.consumeJump();
      this.rideStep(dt);
      return;
    }
    const result = this.model.step(this.move, { ...this.input.movement(), jump: this.input.consumeJump() }, this.cameraYaw(), dt);
    const moved = this.body.move(result.displacement);
    this.stepPhysics(dt);
    // Al aterrizar o al chocar con un techo se anula la velocidad vertical.
    const grounded = moved.grounded && result.state.vy <= 0.01;
    this.move = { ...result.state, grounded, vy: grounded ? 0 : result.state.vy };
    this.prev = this.curr;
    this.curr = this.feet();
    const speed = Math.hypot(this.move.vx, this.move.vz);
    this.state.update(this.entityId, {
      position: this.curr, yaw: this.move.yaw, speed,
      anim: MovementModel.animFor(speed, grounded, this.move.vy),
    });
    this.state.tick();
  }

  /** Posición interpolada para el render (LOOP-1). */
  interpolated(alpha: number): Vec3 {
    return {
      x: this.prev.x + (this.curr.x - this.prev.x) * alpha,
      y: this.prev.y + (this.curr.y - this.prev.y) * alpha,
      z: this.prev.z + (this.curr.z - this.prev.z) * alpha,
    };
  }
}
