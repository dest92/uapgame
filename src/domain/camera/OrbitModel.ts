export const PITCH_MIN = -0.35;
export const PITCH_MAX = 1.2;
export const DIST_MIN = 1.5;
export const DIST_MAX = 8;
const COLLISION_MARGIN = 0.2;
const RETURN_RATE = 4;
const GROUND_CLEARANCE = 0.3;

export interface OrbitState {
  yaw: number;
  pitch: number;
  distance: number;
}

/** Cámara orbital de tercera persona (spec 006, CAM-1..3). Lógica pura. */
export class OrbitModel {
  yaw: number;
  pitch: number;
  distance: number;
  private current: number;

  constructor(init: OrbitState = { yaw: 0, pitch: 0.25, distance: 4.5 }) {
    this.yaw = init.yaw;
    this.pitch = init.pitch;
    this.distance = init.distance;
    this.current = init.distance;
  }

  look(dYaw: number, dPitch: number): void {
    this.yaw += dYaw;
    this.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, this.pitch + dPitch));
  }

  zoom(delta: number): void {
    this.distance = Math.min(DIST_MAX, Math.max(DIST_MIN, this.distance + delta));
  }

  /** Dirección unitaria objetivo→cámara × distancia deseada. */
  desiredOffset(distance = this.distance): { x: number; y: number; z: number } {
    const c = Math.cos(this.pitch);
    return {
      x: Math.sin(this.yaw) * c * distance,
      y: Math.sin(this.pitch) * distance,
      z: Math.cos(this.yaw) * c * distance,
    };
  }

  /**
   * CAM-2/3: `hit` = distancia al primer obstáculo (o null). Se acerca al instante
   * para no atravesar paredes y vuelve con damping cuando se libera.
   */
  resolveDistance(hit: number | null, dt: number): number {
    const limit = hit === null ? this.distance : Math.max(0.3, Math.min(this.distance, hit - COLLISION_MARGIN));
    if (limit < this.current) this.current = limit;
    else this.current += (limit - this.current) * (1 - Math.exp(-RETURN_RATE * dt));
    return this.current;
  }

  /** CAM-3: mantiene la cámara por encima del terreno. */
  static clampAboveGround(cameraY: number, groundY: number): number {
    return Math.max(cameraY, groundY + GROUND_CLEARANCE);
  }
}
