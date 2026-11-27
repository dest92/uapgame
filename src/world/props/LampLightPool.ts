import { PointLight, Vector3, type Camera, type Scene } from 'three/webgpu';
import type { HeightSampler } from '@shared/terrain/heightField';

const POOL = 6;
const REFRESH = 0.5;
const LAMP_HEIGHT = 6.2;

/**
 * Luz real de los faroles de noche sin costo por farol: un pool fijo de PointLights
 * (sin sombras) que se reasigna a los faroles más cercanos a la cámara (SKY-3).
 */
export class LampLightPool {
  private readonly lights: PointLight[] = [];
  private timer = REFRESH;
  private readonly cam = new Vector3();

  constructor(
    scene: Scene,
    private readonly lamps: readonly { x: number; z: number }[],
    private readonly terrain: HeightSampler,
    private readonly camera: Camera,
    private readonly night: () => number,
  ) {
    for (let i = 0; i < POOL; i++) {
      const l = new PointLight('#ffc98a', 0, 28, 1.6);
      l.castShadow = false;
      scene.add(l);
      this.lights.push(l);
    }
  }

  update(dt: number): void {
    const n = this.night();
    for (const l of this.lights) l.intensity = 60 * n;
    this.timer += dt;
    if (this.timer < REFRESH || n < 0.02) return;
    this.timer = 0;
    this.camera.getWorldPosition(this.cam);
    const nearest = [...this.lamps]
      .sort((a, b) => Math.hypot(a.x - this.cam.x, a.z - this.cam.z) - Math.hypot(b.x - this.cam.x, b.z - this.cam.z))
      .slice(0, POOL);
    nearest.forEach((p, i) => {
      // El cabezal está a 1.35 m del poste, pero la diferencia no se nota en el charco de luz.
      this.lights[i]!.position.set(p.x, this.terrain.heightAt(p.x, p.z) + LAMP_HEIGHT, p.z);
    });
  }
}
