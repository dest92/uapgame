import type { Vec2 } from '@shared/geo/types';

/** Recorre una polilínea de ida y vuelta a velocidad constante (NPCs peatones). */
export class PathFollower {
  private readonly cumulative: number[] = [0];
  private s: number;
  private dir = 1;
  position: Vec2;
  /** Rumbo (rad), frente = (sin, cos). */
  heading = 0;

  constructor(private readonly points: readonly Vec2[], readonly speed: number, startFraction: number) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const b = points[i]!;
      this.cumulative.push(this.cumulative[i - 1]! + Math.hypot(b.x - a.x, b.z - a.z));
    }
    this.s = this.length * Math.max(0, Math.min(1, startFraction));
    this.position = points[0]!;
    this.step(0);
  }

  get length(): number {
    return this.cumulative[this.cumulative.length - 1]!;
  }

  step(dt: number): void {
    this.s += this.dir * this.speed * dt;
    if (this.s > this.length) {
      this.s = 2 * this.length - this.s;
      this.dir = -1;
    } else if (this.s < 0) {
      this.s = -this.s;
      this.dir = 1;
    }
    let i = 1;
    while (i < this.cumulative.length - 1 && this.cumulative[i]! < this.s) i++;
    const a = this.points[i - 1]!;
    const b = this.points[i]!;
    const seg = this.cumulative[i]! - this.cumulative[i - 1]! || 1;
    const t = (this.s - this.cumulative[i - 1]!) / seg;
    this.position = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    const dx = (b.x - a.x) * this.dir || 0; // evita -0 (atan2 daría −π en vez de π)
    const dz = (b.z - a.z) * this.dir || 0;
    if (dx || dz) this.heading = Math.atan2(dx, dz);
  }
}
