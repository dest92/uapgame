import { Color, Fog, PerspectiveCamera, Scene } from 'three/webgpu';

/** Escena y cámara principales. Sin lógica: solo contenedor compartido por los sistemas de render. */
export class SceneContext {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(55, 1, 0.1, 4000);

  constructor() {
    this.scene.background = new Color('#9cc3e6');
    this.scene.fog = new Fog('#c9dbe8', 200, 1600);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }
}
