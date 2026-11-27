import { describe, expect, it } from 'vitest';
import { area, traceMask } from '../../../tools/hero/lib/contours';

function mask(w: number, h: number, on: (x: number, y: number) => boolean): Uint8Array {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = on(x, y) ? 255 : 0;
  return m;
}

describe('traceMask (vectorización de letras)', () => {
  it('un cuadrado lleno da un único contorno cerrado de área ≈ la de los píxeles', () => {
    const out = traceMask(mask(20, 20, (x, y) => x >= 5 && x < 15 && y >= 5 && y < 15), 20, 20);
    expect(out).toHaveLength(1);
    expect(out[0]!.holes).toHaveLength(0);
    expect(Math.abs(area(out[0]!.outer))).toBeGreaterThan(80);
    expect(Math.abs(area(out[0]!.outer))).toBeLessThan(110);
  });

  it('un anillo (letra "O") da un exterior con un hueco', () => {
    const out = traceMask(mask(40, 40, (x, y) => {
      const r = Math.hypot(x - 20, y - 20);
      return r < 15 && r > 8;
    }), 40, 40);
    expect(out).toHaveLength(1);
    expect(out[0]!.holes).toHaveLength(1);
  });

  it('dos regiones separadas dan dos contornos', () => {
    const out = traceMask(mask(30, 10, (x, y) => y > 2 && y < 8 && (x < 8 || x > 20)), 30, 10);
    expect(out).toHaveLength(2);
  });
});
