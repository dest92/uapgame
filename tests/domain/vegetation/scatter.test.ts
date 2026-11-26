import { describe, it, expect } from 'vitest';
import { scatterTrees, speciesAt, mulberry32 } from '../../../src/domain/vegetation/scatter';
import { pointInPolygon } from '@shared/geo/polygon';

const park = [{ x: 0, z: 0 }, { x: 100, z: 0 }, { x: 100, z: 100 }, { x: 0, z: 100 }];
const building = [{ x: 40, z: 40 }, { x: 60, z: 40 }, { x: 60, z: 60 }, { x: 40, z: 60 }];
const road = { points: [{ x: 0, z: 80 }, { x: 100, z: 80 }], width: 6 };

describe('scatterTrees', () => {
  const input = { fillAreas: [park], blockers: [building], corridors: [road], fixed: [{ x: 10, z: 10 }], spacing: 10, seed: 42 };
  const trees = scatterTrees(input);

  it('VEG-1: determinista para la misma semilla', () => {
    expect(scatterTrees(input)).toEqual(trees);
  });
  it('VEG-1: dentro de las áreas, fuera de edificios y caminos', () => {
    expect(trees.length).toBeGreaterThan(20);
    for (const t of trees.filter((x) => x.source === 'procedural')) {
      expect(pointInPolygon(t.position, park)).toBe(true);
      expect(pointInPolygon(t.position, building)).toBe(false);
      expect(Math.abs(t.position.z - 80)).toBeGreaterThan(3);
    }
  });
  it('VEG-2: respeta árboles fijos y mantiene ≥ 4 m de separación', () => {
    expect(trees.some((t) => t.source === 'osm' && t.position.x === 10)).toBe(true);
    for (let i = 0; i < trees.length; i++)
      for (let j = i + 1; j < trees.length; j++) {
        const d = Math.hypot(trees[i]!.position.x - trees[j]!.position.x, trees[i]!.position.z - trees[j]!.position.z);
        expect(d).toBeGreaterThanOrEqual(4);
      }
  });
  it('VEG-3: especie determinista por posición, con las 3 especies representadas', () => {
    expect(speciesAt({ x: 12.5, z: 7 })).toBe(speciesAt({ x: 12.5, z: 7 }));
    const set = new Set(Array.from({ length: 200 }, (_, i) => speciesAt({ x: i * 7.3, z: i * 3.1 })));
    expect(set.size).toBe(3);
  });
  it('rng mulberry32 en [0,1)', () => {
    const r = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
