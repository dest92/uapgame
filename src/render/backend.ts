export type BackendKind = 'webgpu' | 'webgl2';

export interface BackendProbe {
  readonly hasNavigatorGpu: boolean;
  readonly adapterAvailable: boolean;
  /** `location.search`, para forzar backend con `?backend=webgl`. */
  readonly query: string;
}

/** Decide el backend (RND-1/2). Lógica pura, testeable sin GPU. */
export function chooseBackend(p: BackendProbe): BackendKind {
  if (new URLSearchParams(p.query).get('backend') === 'webgl') return 'webgl2';
  return p.hasNavigatorGpu && p.adapterAvailable ? 'webgpu' : 'webgl2';
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
  return { hasNavigatorGpu: !!gpu, adapterAvailable, query: location.search };
}

export const backendLabel = (k: BackendKind): string => (k === 'webgpu' ? 'WebGPU' : 'WebGL2');
