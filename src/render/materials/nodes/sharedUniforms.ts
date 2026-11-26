import { uniform } from 'three/tsl';

/**
 * Uniforms globales que los shaders leen y el SkySystem escribe.
 * `night` 0..1 enciende ventanas y farolas; `wind` escala el viento.
 */
export const sceneUniforms = {
  night: uniform(0),
  wind: uniform(1),
};
