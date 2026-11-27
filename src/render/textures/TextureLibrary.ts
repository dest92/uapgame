import { RepeatWrapping, SRGBColorSpace, type Texture } from 'three/webgpu';
import type { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

export type TextureSetName = 'grass' | 'dirt' | 'asphalt' | 'paving' | 'concrete' | 'brick' | 'plaster' | 'rooftiles' | 'bark' | 'metal'
  /** Horneadas por texel (tools/build-proc-textures.ts, mismo generador que los hero assets). */
  | 'procbrick' | 'procplaster';

export interface PbrSet {
  readonly color: Texture;
  readonly normal: Texture;
  readonly rough: Texture;
}

const SETS: readonly TextureSetName[] = ['grass', 'dirt', 'asphalt', 'paving', 'concrete', 'brick', 'plaster', 'rooftiles', 'bark', 'metal', 'procbrick', 'procplaster'];

/** Carga los sets PBR KTX2 de public/textures (generados por tools/fetch-textures.ts). */
export class TextureLibrary {
  private constructor(private readonly sets: ReadonlyMap<TextureSetName, PbrSet>) {}

  static async load(ktx2: KTX2Loader, anisotropy: number, onProgress?: (p: number) => void): Promise<TextureLibrary> {
    const base = `${import.meta.env.BASE_URL}textures/`;
    let done = 0;
    const total = SETS.length * 3;
    const load = async (url: string, srgb: boolean): Promise<Texture> => {
      const t = await ktx2.loadAsync(url);
      t.wrapS = t.wrapT = RepeatWrapping;
      t.anisotropy = anisotropy;
      if (srgb) t.colorSpace = SRGBColorSpace;
      onProgress?.(++done / total);
      return t;
    };
    const entries = await Promise.all(SETS.map(async (name) => {
      const [color, normal, rough] = await Promise.all([
        load(`${base}${name}/color.ktx2`, true), load(`${base}${name}/normal.ktx2`, false), load(`${base}${name}/rough.ktx2`, false),
      ]);
      return [name, { color, normal, rough }] as const;
    }));
    return new TextureLibrary(new Map(entries));
  }

  get(name: TextureSetName): PbrSet {
    const s = this.sets.get(name);
    if (!s) throw new Error(`Textura no cargada: ${name}`);
    return s;
  }
}
