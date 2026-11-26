import { MeshStandardNodeMaterial, type MeshStandardMaterial } from 'three/webgpu';
import { attribute, clamp, color, float, mix, normalMap, normalView, positionLocal, sin, texture, abs } from 'three/tsl';

export interface Outfit {
  readonly shirt: string;
  readonly pants: string;
  readonly shoes: string;
}

export const DEFAULT_OUTFIT: Outfit = { shirt: '#2c4f73', pants: '#2a3446', shoes: '#ecebe6' };

/** Peso suave de la región `r` (atributo interpolado). */
const weight = (r: number) => clamp(float(1).sub(abs(attribute('region', 'float').sub(r))), 0, 1);

/**
 * Material TSL que pinta ropa sobre el cuerpo base: conserva piel/rostro del
 * albedo original y reemplaza torso, piernas y pies por tela (sin el relieve
 * muscular del normal map en las zonas con ropa).
 */
export function createClothingMaterial(src: MeshStandardMaterial, outfit: Outfit = DEFAULT_OUTFIT): MeshStandardNodeMaterial {
  const m = new MeshStandardNodeMaterial();
  const skinAlbedo = src.map ? texture(src.map).rgb : color('#c58c6b');
  const shirtW = weight(1);
  const pantsW = weight(2);
  const shoesW = weight(3);
  const cloth = shirtW.add(pantsW).add(shoesW).clamp(0, 1);

  // Pliegues sutiles: variación de tono según altura local (sin texturas extra).
  const folds = sin(positionLocal.y.mul(38)).mul(0.04).add(0.96);
  const denimSeam = sin(positionLocal.x.mul(260)).mul(0.015).add(1);
  let c = mix(skinAlbedo, color(outfit.shirt).mul(folds), shirtW);
  c = mix(c, color(outfit.pants).mul(folds).mul(denimSeam), pantsW);
  c = mix(c, color(outfit.shoes), shoesW);
  m.colorNode = c;

  const roughSkin = src.roughnessMap ? texture(src.roughnessMap).g : float(0.55);
  m.roughnessNode = mix(roughSkin, float(0.92), cloth);
  m.metalnessNode = float(0);
  if (src.normalMap) {
    m.normalNode = mix(normalMap(texture(src.normalMap)), normalView, cloth);
  }
  m.name = 'clothing';
  return m;
}
