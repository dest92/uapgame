import { describe, it, expect } from 'vitest';
import { HeightField, gaussianSmooth } from '@shared/terrain/heightField';

const grid = { originX: 0, originZ: 0, cellSize: 10, cols: 3, rows: 3, heights: [0, 0, 0, 0, 10, 0, 0, 0, 0] };

describe('HeightField', () => {
  const hf = new HeightField(grid);
  it('muestrea vértices exactos', () => {
    expect(hf.heightAt(10, 10)).toBe(10);
    expect(hf.heightAt(0, 0)).toBe(0);
  });
  it('interpola bilinealmente', () => {
    expect(hf.heightAt(5, 10)).toBeCloseTo(5);
    expect(hf.heightAt(5, 5)).toBeCloseTo(2.5);
  });
  it('fuera de la grilla usa el borde (clamp)', () => {
    expect(hf.heightAt(-100, 10)).toBe(0);
  });
  it('normal apunta hacia arriba en zona plana', () => {
    const flat = new HeightField({ ...grid, heights: grid.heights.map(() => 3) });
    expect(flat.normalAt(10, 10).y).toBeCloseTo(1);
  });
  it('flat() devuelve altura constante', () => {
    expect(HeightField.flat(0).heightAt(123, -45)).toBe(0);
  });
});

describe('gaussianSmooth', () => {
  it('reduce picos y conserva la media aproximada', () => {
    const out = gaussianSmooth(grid.heights, 3, 3, 1);
    expect(out[4]).toBeLessThan(10);
    expect(out[4]).toBeGreaterThan(0);
    expect(out[0]).toBeGreaterThan(0);
  });
  it('una grilla constante no cambia', () => {
    expect(gaussianSmooth([5, 5, 5, 5], 2, 2, 2)).toEqual([5, 5, 5, 5]);
  });
});
