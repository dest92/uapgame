import { LoadingManager, type WebGPURenderer } from 'three/webgpu';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/** Cargador de glTF con Draco, Meshopt y KTX2 (HERO-4), con progreso agregado. */
export class AssetLoader {
  private readonly gltf: GLTFLoader;
  readonly ktx2: KTX2Loader;

  constructor(renderer: WebGPURenderer, onProgress?: (loaded: number, total: number) => void) {
    const manager = new LoadingManager();
    if (onProgress) manager.onProgress = (_url, loaded, total) => onProgress(loaded, total);
    const base = import.meta.env.BASE_URL;
    this.ktx2 = new KTX2Loader(manager).setTranscoderPath(`${base}libs/basis/`);
    this.ktx2.detectSupport(renderer);
    const draco = new DRACOLoader(manager).setDecoderPath(`${base}libs/draco/`);
    this.gltf = new GLTFLoader(manager).setKTX2Loader(this.ktx2).setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
  }

  loadGltf(url: string): Promise<GLTF> {
    return this.gltf.loadAsync(url);
  }
}
