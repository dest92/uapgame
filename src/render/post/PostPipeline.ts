import { RenderPipeline, type PerspectiveCamera, type Scene, type WebGPURenderer } from 'three/webgpu';
import { float, mix, mrt, normalView, output, pass, screenUV, smoothstep, vec3, vec4, length, luminance, interleavedGradientNoise, screenCoordinate } from 'three/tsl';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import type { QualityProfile } from '../../domain/quality/QualityProfiles';
import type { FramePresenter } from '../RenderSystem';

/**
 * Post-procesado (spec 009): GTAO, bloom sutil, corrección de color y viñeta.
 * El tone mapping (AgX/ACES) lo aplica el renderer al final (outputColorTransform).
 */
export function createPostPipeline(renderer: WebGPURenderer, scene: Scene, camera: PerspectiveCamera, q: QualityProfile): FramePresenter {
  const pipeline = new RenderPipeline(renderer);
  const scenePass = pass(scene, camera);
  const color = scenePass.getTextureNode('output');
  let result = color.rgb;

  if (q.ao) {
    // AO en una sola pasada: MRT (color + normales) y se multiplica el resultado.
    // (Aplicarlo vía builtinAOContext requeriría una pre-pasada extra de geometría.)
    scenePass.setMRT(mrt({ output, normal: normalView }));
    const aoPass = ao(scenePass.getTextureNode('depth'), scenePass.getTextureNode('normal'), camera);
    aoPass.resolutionScale = 0.5;
    aoPass.radius.value = 1.4;
    aoPass.thickness.value = 1.5;
    const occlusion = aoPass.getTextureNode().sample(screenUV).r;
    result = result.mul(mix(float(1), occlusion, float(0.9)));
  }

  if (q.bloom) result = result.add(bloom(color, 0.1, 0.3, 5.0).rgb);

  // Grading (técnica de Voidlight): sombras frías y algo desaturadas, luces cálidas, + saturación global.
  const lum = luminance(result);
  const shadowW = smoothstep(0.35, 0.0, lum);
  const highW = smoothstep(0.45, 1.6, lum);
  result = mix(result, mix(vec3(lum), result, float(0.8)).mul(vec3(0.94, 0.98, 1.06)), shadowW.mul(0.6));
  result = result.mul(mix(vec3(1), vec3(1.05, 1.01, 0.94), highW));
  result = mix(vec3(luminance(result)), result, float(1.15));
  const vignette = smoothstep(0.95, 0.35, length(screenUV.sub(0.5)).mul(1.25));
  result = result.mul(mix(float(0.82), float(1), vignette));
  // Dither para evitar banding en el cielo y degradés.
  result = result.add(interleavedGradientNoise(screenCoordinate.xy).sub(0.5).mul(1 / 255));
  pipeline.outputNode = vec4(result, 1);
  return { render: () => pipeline.render() };
}
