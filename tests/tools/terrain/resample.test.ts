import { describe, it, expect } from 'vitest';
import { resampleTerrain } from '../../../tools/lib/terrain/resample';
import { createEnuProjection } from '@shared/geo/enu';

describe('resampleTerrain (terreno MDE)', () => {
  const proj = createEnuProjection({ lon: -60.4672, lat: -32.0734 });
  const bounds = { minX: -100, minZ: -100, maxX: 100, maxZ: 100 };
  // Plano inclinado: sube 1 m cada 0.0001° de longitud (~9.45 m).
  const sampler = (lon: number, _lat: number): number => 60 + (lon + 60.4672) * 10000;

  const t = resampleTerrain({ bounds, cellSize: 20, proj, sampleGeo: sampler, sigmaCells: 0, source: 'test' });
  it('genera una grilla que cubre los bounds', () => {
    expect(t.kind).toBe('heightmap');
    expect(t.grid!.cols).toBe(11);
    expect(t.grid!.rows).toBe(11);
    expect(t.grid!.heights).toHaveLength(121);
  });
  it('las alturas son relativas al origen (y=0 en el centro del campus)', () => {
    const mid = t.grid!.heights[5 * 11 + 5]!;
    expect(mid).toBeCloseTo(0, 1);
  });
  it('preserva la pendiente (≈ +21 m en 200 m hacia el este)', () => {
    const row = 5 * 11;
    expect(t.grid!.heights[row + 10]! - t.grid!.heights[row]!).toBeCloseTo(200 / 9.45, 0);
  });
});
