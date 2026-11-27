import { describe, expect, it } from 'vitest';
import { brickTexture, fbm, flagstoneTexture, normalFromHeight, noise } from '../../../tools/hero/lib/proctex';

describe('texturas procedurales por texel', () => {
  it('el ruido y el fbm son periódicos (texturas sin costuras)', () => {
    expect(noise(0.3, 0.7, 8)).toBeCloseTo(noise(8.3, 0.7, 8), 10);
    expect(fbm(0.1, 0.2, 4)).toBeCloseTo(fbm(1.1, 1.2, 4), 10);
  });

  it('son deterministas para la misma semilla', () => {
    expect(brickTexture(64, 5).albedo).toEqual(brickTexture(64, 5).albedo);
    expect(flagstoneTexture(64, 2).height).toEqual(flagstoneTexture(64, 2).height);
  });

  it('el ladrillo tiene juntas hundidas (altura baja) y caras altas', () => {
    const t = brickTexture(128);
    const hs = [...t.height];
    expect(Math.min(...hs)).toBeLessThan(0.1);
    expect(Math.max(...hs)).toBeGreaterThan(0.6);
  });

  it('la laja empalma en los bordes: el salto entre la última y la primera columna es como el de cualquier par vecino', () => {
    const t = flagstoneTexture(128);
    const N = t.size;
    const col = (a: number, b: number): number => {
      let d = 0;
      for (let y = 0; y < N; y++) d += Math.abs(t.height[y * N + a]! - t.height[y * N + b]!);
      return d / N;
    };
    const inner = Array.from({ length: N - 1 }, (_, x) => col(x, x + 1));
    expect(col(N - 1, 0)).toBeLessThanOrEqual(Math.max(...inner) + 1e-9);
  });

  it('el ladrillo tiene un número par de hiladas (el trabado empalma al repetir en V)', () => {
    const t = brickTexture(140);
    // Fila 0 y fila 139 pertenecen a hiladas con distinto desfase: sus juntas verticales no coinciden.
    const jointsAt = (y: number): number[] => Array.from({ length: t.size }, (_, x) => x).filter((x) => t.height[y * t.size + x]! < 0.05);
    expect(jointsAt(5)).not.toEqual(jointsAt(140 - 5));
  });

  it('el normal map de una superficie plana apunta a +Z', () => {
    const flat = { size: 4, albedo: new Uint8Array(48), height: new Float32Array(16).fill(0.5) };
    const n = normalFromHeight(flat);
    expect([n[0], n[1], n[2]]).toEqual([128, 128, 255]);
  });
});
