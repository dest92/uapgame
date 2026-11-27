import type { HeroBuilder } from '../lib/builder';
import type { MaterialSpec } from '../lib/materials';

/** Resultado de un generador de hero asset: geometría por material + especificación de materiales. */
export interface HeroModel<M extends string> {
  readonly builder: HeroBuilder<M>;
  readonly materials: Readonly<Record<M, MaterialSpec>>;
}
