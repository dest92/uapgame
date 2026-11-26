import { RenderPipeline, type PerspectiveCamera, type Scene, type WebGPURenderer } from 'three/webgpu';
import { float, mix, mrt, normalView, output, pass, screenUV, smoothstep, vec3, vec4, length, luminance } from 'three/tsl';
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

  if (q.bloom) result = result.add(bloom(color, 0.12, 0.35, 2.2).rgb);

  // Grading: leve contraste y saturación + viñeta.
  const lum = luminance(result);
  result = mix(vec3(lum), result, float(1.08));
  const vignette = smoothstep(0.95, 0.35, length(screenUV.sub(0.5)).mul(1.25));
  result = result.mul(mix(float(0.82), float(1), vignette));
  pipeline.outputNode = vec4(result, 1);
  return { render: () => pipeline.render() };
}
