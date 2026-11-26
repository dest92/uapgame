import { describe, it, expect } from 'vitest';
import { regionForBone, ClothingRegion, dominantBone } from '../../src/player/clothingRegions';

describe('regiones de ropa por hueso', () => {
  it.each([
    ['spine_02', ClothingRegion.Shirt], ['clavicle_l', ClothingRegion.Shirt], ['upperarm_r', ClothingRegion.Shirt],
    ['pelvis', ClothingRegion.Pants], ['thigh_l', ClothingRegion.Pants], ['calf_r', ClothingRegion.Pants],
    ['foot_l', ClothingRegion.Shoes], ['ball_r', ClothingRegion.Shoes],
    ['Head', ClothingRegion.Skin], ['neck_01', ClothingRegion.Skin], ['lowerarm_l', ClothingRegion.Skin], ['hand_r', ClothingRegion.Skin],
  ])('%s → %s', (bone, region) => expect(regionForBone(bone)).toBe(region));

  it('hueso dominante por peso', () => {
    expect(dominantBone([3, 7, 0, 0], [0.2, 0.7, 0.1, 0])).toBe(7);
  });
});
