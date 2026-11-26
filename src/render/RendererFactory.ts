import { ACESFilmicToneMapping, AgXToneMapping, PCFShadowMap, SRGBColorSpace, WebGPURenderer } from 'three/webgpu';
import { chooseBackend, probeBackend, type BackendKind } from './backend';

export interface RendererHandle {
  readonly renderer: WebGPURenderer;
  readonly backend: BackendKind;
}

/**
 * Crea el WebGPURenderer con fallback automático a WebGL2 (RND-1..4).
 * Three usa el backend WebGL2 cuando `forceWebGL` es true o WebGPU no está disponible.
 */
export async function createRenderer(canvas: HTMLCanvasElement, antialias: boolean): Promise<RendererHandle> {
  const wanted = chooseBackend(await probeBackend());
  const tryCreate = async (forceWebGL: boolean): Promise<WebGPURenderer> => {
    const r = new WebGPURenderer({ canvas, antialias, forceWebGL, powerPreference: 'high-performance' });
    await r.init();
    return r;
  };

  let renderer: WebGPURenderer;
  try {
    renderer = await tryCreate(wanted === 'webgl2');
  } catch (err) {
    if (wanted === 'webgl2') throw err;
    console.warn('[render] WebGPU falló, usando WebGL2', err);
    renderer = await tryCreate(true);
  }

  const backendObj = renderer.backend as { isWebGPUBackend?: boolean };
  const backend: BackendKind = backendObj.isWebGPUBackend ? 'webgpu' : 'webgl2';
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = new URLSearchParams(location.search).get('tonemap') === 'aces' ? ACESFilmicToneMapping : AgXToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  return { renderer, backend };
}
