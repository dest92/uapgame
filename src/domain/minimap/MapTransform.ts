import type { Vec2 } from '@shared/geo/types';

/** Mundo → píxeles del minimapa centrado en el jugador y rotado según la cámara (MAP-2/3). */
export class MapTransform {
  constructor(
    readonly sizePx: number,
    readonly pxPerMeter: number,
  ) {}

  toMap(p: Vec2, center: Vec2, cameraYaw: number): { x: number; y: number } {
    const dx = p.x - center.x;
    const dz = p.z - center.z;
    const rx = Math.cos(cameraYaw);
    const rz = -Math.sin(cameraYaw);
    const fx = -Math.sin(cameraYaw);
    const fz = -Math.cos(cameraYaw);
    const half = this.sizePx / 2;
    return {
      x: half + (dx * rx + dz * rz) * this.pxPerMeter,
      y: half - (dx * fx + dz * fz) * this.pxPerMeter,
    };
  }
}
