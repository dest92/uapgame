import { DirectionalLight, HemisphereLight, type Scene } from 'three/webgpu';

/** Iluminación provisoria del Hito 1 (el Hito 3 la reemplaza por SkySystem). */
export function addBasicLighting(scene: Scene): DirectionalLight {
  scene.add(new HemisphereLight('#cfe3ff', '#5a5040', 1.2));
  const sun = new DirectionalLight('#fff3df', 3);
  sun.position.set(-300, 400, 200);
  scene.add(sun);
  return sun;
}
