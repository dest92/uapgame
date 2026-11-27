export const BIKE_MAX_SPEED = 6.5;
export const BIKE_SPRINT_SPEED = 9;
const ACCEL = 2.2;
const BRAKE = 5;
const ROLL_DRAG = 0.35;
const REVERSE_MAX = -1.5;
const WHEELBASE = 1.05;
const MAX_STEER = 0.6;

export interface BikeInput {
  /** −1..1: pedalear / frenar. */
  readonly throttle: number;
  /** −1..1: manubrio (derecha positiva). */
  readonly steer: number;
  readonly sprint: boolean;
}

export interface BikeState {
  readonly speed: number;
  /** Rumbo (rad). Frente = (sin, cos). */
  readonly heading: number;
  readonly lean: number;
  /** Ángulo acumulado de las ruedas (rad) para animarlas. */
  readonly wheelAngle: number;
}

export const initialBikeState = (heading: number): BikeState => ({ speed: 0, heading, lean: 0, wheelAngle: 0 });

/** Cinemática de bicicleta (modelo de bicicleta simple, spec 013 VEH-1..4). Pura y testeable. */
export class BikeModel {
  step(s: BikeState, input: BikeInput, dt: number): { state: BikeState; displacement: { x: number; z: number } } {
    const top = input.sprint ? BIKE_SPRINT_SPEED : BIKE_MAX_SPEED;
    let speed = s.speed;
    if (input.throttle > 0.05) speed += Math.min(ACCEL * input.throttle, (top - speed) * 1.5) * dt;
    else if (input.throttle < -0.05) speed = speed > 0 ? Math.max(0, speed - BRAKE * dt) : Math.max(REVERSE_MAX, speed - ACCEL * 0.5 * dt);
    else speed -= Math.sign(speed) * Math.min(Math.abs(speed), (ROLL_DRAG + Math.abs(speed) * 0.04) * dt);

    // Radio de giro de bicicleta: yaw rate = v · tan(δ) / L (más cerrado a baja velocidad para un mismo δ efectivo).
    const delta = -input.steer * MAX_STEER * (1 / (1 + Math.abs(speed) * 0.12));
    const heading = s.heading + (speed * Math.tan(delta) * dt) / WHEELBASE;
    const targetLean = Math.max(-0.5, Math.min(0.5, -(speed * speed * Math.tan(delta)) / (WHEELBASE * 9.81)));
    const lean = s.lean + (targetLean - s.lean) * Math.min(1, dt * 6);
    return {
      state: { speed, heading, lean, wheelAngle: s.wheelAngle + (speed * dt) / 0.34 },
      displacement: { x: Math.sin(heading) * speed * dt, z: Math.cos(heading) * speed * dt },
    };
  }
}
