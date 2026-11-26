import type { AnimState } from '../../core/state/GameState';

export const WALK_SPEED = 1.6;
export const RUN_SPEED = 5.5;
export const GRAVITY = 9.81;
export const JUMP_SPEED = 4.4;
const GROUND_ACCEL = 10;
const AIR_ACCEL = 2.5;
const TURN_RATE = 10;
const STICK_VELOCITY = -2;

export interface MoveInput {
  readonly moveX: number;
  readonly moveY: number;
  readonly run: boolean;
  readonly jump: boolean;
}

export interface MoveState {
  readonly vx: number;
  readonly vy: number;
  readonly vz: number;
  /** Orientación del personaje (rad). Frente = (sin yaw, cos yaw). */
  readonly yaw: number;
  readonly grounded: boolean;
  readonly anim: AnimState;
}

export interface MoveResult {
  readonly state: MoveState;
  readonly displacement: { readonly x: number; readonly y: number; readonly z: number };
  readonly jumped: boolean;
}

export const initialMoveState = (): MoveState => ({ vx: 0, vy: 0, vz: 0, yaw: 0, grounded: false, anim: 'idle' });

const wrapAngle = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Modelo de locomoción puro (spec 006). No conoce física ni render: produce el
 * desplazamiento deseado que el character controller corrige con colisiones.
 */
export class MovementModel {
  step(s: MoveState, input: MoveInput, cameraYaw: number, dt: number): MoveResult {
    // MOV-1: ejes relativos a la cámara. Adelante = (−sin, −cos), derecha = (cos, −sin).
    const fx = -Math.sin(cameraYaw);
    const fz = -Math.cos(cameraYaw);
    const rx = Math.cos(cameraYaw);
    const rz = -Math.sin(cameraYaw);
    const mag = Math.min(1, Math.hypot(input.moveX, input.moveY));
    const speed = mag * (input.run ? RUN_SPEED : WALK_SPEED);
    let tx = fx * input.moveY + rx * input.moveX;
    let tz = fz * input.moveY + rz * input.moveX;
    const tl = Math.hypot(tx, tz);
    if (tl > 1e-6) {
      tx = (tx / tl) * speed;
      tz = (tz / tl) * speed;
    }

    // MOV-2: aproximación exponencial (independiente del framerate).
    const k = 1 - Math.exp(-(s.grounded ? GROUND_ACCEL : AIR_ACCEL) * dt);
    const vx = s.vx + (tx - s.vx) * k;
    const vz = s.vz + (tz - s.vz) * k;

    // MOV-3: salto y gravedad.
    const jumped = input.jump && s.grounded;
    let vy = jumped ? JUMP_SPEED : s.vy;
    if (!s.grounded || jumped) vy -= GRAVITY * dt;
    else vy = STICK_VELOCITY;

    // MOV-4: giro suave hacia la dirección de movimiento.
    const horizontal = Math.hypot(vx, vz);
    let yaw = s.yaw;
    if (horizontal > 0.2 && tl > 1e-6) {
      const target = Math.atan2(vx, vz);
      const diff = wrapAngle(target - yaw);
      yaw = wrapAngle(yaw + Math.sign(diff) * Math.min(Math.abs(diff), TURN_RATE * dt));
    }

    const anim = MovementModel.animFor(horizontal, s.grounded && !jumped, vy);
    return {
      state: { vx, vy, vz, yaw, grounded: s.grounded && !jumped, anim },
      displacement: { x: vx * dt, y: vy * dt, z: vz * dt },
      jumped,
    };
  }

  /** MOV-5 */
  static animFor(horizontalSpeed: number, grounded: boolean, vy: number): AnimState {
    if (!grounded) return vy > 0.5 ? 'jump' : 'fall';
    if (horizontalSpeed < 0.15) return 'idle';
    if (horizontalSpeed < 2.4) return 'walk';
    if (horizontalSpeed < 4.4) return 'jog';
    return 'run';
  }
}
