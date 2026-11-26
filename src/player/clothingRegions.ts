/**
 * El personaje base CC0 viene en ropa interior; para una pieza institucional se
 * "viste" con un shader que pinta remera, jean y zapatillas según el hueso
 * dominante de cada vértice.
 */
export const ClothingRegion = { Skin: 0, Shirt: 1, Pants: 2, Shoes: 3 } as const;
export type ClothingRegion = (typeof ClothingRegion)[keyof typeof ClothingRegion];

export function regionForBone(name: string): ClothingRegion {
  if (/^(foot|ball)/.test(name)) return ClothingRegion.Shoes;
  if (/^(pelvis|thigh|calf)/.test(name)) return ClothingRegion.Pants;
  if (/^(spine|clavicle|upperarm)/.test(name)) return ClothingRegion.Shirt;
  return ClothingRegion.Skin;
}

export function dominantBone(indices: ArrayLike<number>, weights: ArrayLike<number>): number {
  let best = 0;
  for (let i = 1; i < 4; i++) if ((weights[i] ?? 0) > (weights[best] ?? 0)) best = i;
  return indices[best] ?? 0;
}
