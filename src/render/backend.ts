export type BackendKind = 'webgpu' | 'webgl2';

export interface BackendProbe {
  readonly hasNavigatorGpu: boolean;
  readonly adapterAvailable: boolean;
  /** `location.search`, para forzar backend con `?backend=webgl`. */
  readonly query: string;
  /** `location.hash` (`#webgl` / `#webgpu`): en artifacts el query string no llega. */
  readonly hash?: string;
  /** Preferencia del despliegue cuando el usuario no eligió (p.ej. artifact → WebGL2). */
  readonly preferred?: BackendKind;
}

/** Decide el backend (RND-1/2). Lógica pura, testeable sin GPU. */
export function chooseBackend(p: BackendProbe): BackendKind {
  const gpuOk = p.hasNavigatorGpu && p.adapterAvailable;
  if (new URLSearchParams(p.query).get('backend') === 'webgl' || p.hash === '#webgl') return 'webgl2';
  if (p.hash === '#webgpu') return gpuOk ? 'webgpu' : 'webgl2';
  if (p.preferred === 'webgl2') return 'webgl2';
  return gpuOk ? 'webgpu' : 'webgl2';
}

/** Sondea el navegador real. */
export async function probeBackend(): Promise<BackendProbe> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  let adapterAvailable = false;
  if (gpu) {
    try {
      adapterAvailable = (await gpu.requestAdapter()) !== null;
    } catch {
      adapterAvailable = false;
    }
  }
  const preferred = (window as Window & { __UAP_DEFAULT_BACKEND__?: BackendKind }).__UAP_DEFAULT_BACKEND__;
  return { hasNavigatorGpu: !!gpu, adapterAvailable, query: location.search, hash: location.hash, ...(preferred ? { preferred } : {}) };
}

export const backendLabel = (k: BackendKind): string => (k === 'webgpu' ? 'WebGPU' : 'WebGL2');
