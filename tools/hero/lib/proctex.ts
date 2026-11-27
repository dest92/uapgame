/**
 * Texturas PBR procedurales "por texel" (técnica Voidlight, docs/research/voidlight-techniques.md §3.1):
 * cada generador devuelve albedo RGB y altura en [0, 1], todo periódico (tileable). El normal map se deriva
 * de la altura por diferencias centrales con wrap. Puro: sin dependencias de motor ni de I/O.
 */

export interface ProcTexture {
  readonly size: number;
  /** RGB 0..255, fila por fila. */
  readonly albedo: Uint8Array;
  /** Altura 0..1. */
  readonly height: Float32Array;
}

const fract = (x: number): number => x - Math.floor(x);
const mod = (a: number, n: number): number => ((a % n) + n) % n;
const smooth = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Hash entero → [0, 1). */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Ruido de valor periódico (período en celdas). */
export function noise(x: number, y: number, period: number, seed = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const h = (i: number, j: number): number => hash2(mod(xi + i, period), mod(yi + j, period), seed);
  return (h(0, 0) * (1 - u) + h(1, 0) * u) * (1 - v) + (h(0, 1) * (1 - u) + h(1, 1) * u) * v;
}

/** fbm periódico: u, v en [0, 1). */
export function fbm(u: number, v: number, basePeriod: number, octaves = 4, seed = 0): number {
  let s = 0, a = 0.5, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const p = basePeriod << o;
    s += a * noise(u * p, v * p, p, seed + o * 17);
    norm += a;
    a *= 0.5;
  }
  return s / norm;
}

function make(size: number, fn: (u: number, v: number) => [number, number, number, number]): ProcTexture {
  const albedo = new Uint8Array(size * size * 3);
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, h] = fn(x / size, y / size);
      const i = y * size + x;
      albedo[i * 3] = Math.round(Math.min(255, Math.max(0, r)));
      albedo[i * 3 + 1] = Math.round(Math.min(255, Math.max(0, g)));
      albedo[i * 3 + 2] = Math.round(Math.min(255, Math.max(0, b)));
      height[i] = h;
    }
  }
  return { size, albedo, height };
}

/**
 * Ladrillo visto: hiladas desfasadas (1 m de textura = 13 hiladas × 4 ladrillos de 25 cm), junta de mortero
 * hundida, tono por ladrillo (rojos, ocres y algunos quemados), desgaste en aristas y poros.
 */
export function brickTexture(size = 512, seed = 1): ProcTexture {
  const rows = 13, cols = 4;
  const joint = 0.06; // fracción de celda
  return make(size, (u, v) => {
    const ry = v * rows;
    const row = Math.floor(ry);
    const rx = u * cols + (row % 2) * 0.5;
    const col = Math.floor(rx);
    const fx = fract(rx), fy = fract(ry);
    const id = hash2(mod(col, cols), row, seed);
    const edge = Math.min(fx * 4, (1 - fx) * 4, fy, 1 - fy); // ~distancia al borde en unidades de alto de hilada
    const mortar = 1 - smooth(joint, joint + 0.08, edge);
    const grain = fbm(u, v, 32, 3, seed + 5);
    const burnt = id > 0.86 ? 0.55 : 1;
    const tone = (0.78 + id * 0.35) * burnt * (0.9 + grain * 0.2);
    const brick: [number, number, number] = [150 * tone, 72 * tone * (0.9 + hash2(row, col, seed + 2) * 0.2), 52 * tone];
    const wear = smooth(0.7, 0.95, fbm(u, v, 16, 3, seed + 9)) * (1 - smooth(0, 0.35, edge));
    const mort: [number, number, number] = [176, 168, 156];
    const m = Math.max(mortar, wear * 0.6);
    const h = (1 - mortar) * (0.75 + grain * 0.25) - wear * 0.15;
    return [brick[0] * (1 - m) + mort[0] * m, brick[1] * (1 - m) + mort[1] * m, brick[2] * (1 - m) + mort[2] * m, h];
  });
}

/**
 * Piedra laja (mampostería irregular): Voronoi periódico de lajas de 15–30 cm, color por laja
 * (arenas, ocres, grises), junta oscura hundida, relieve por laja y vetas finas.
 */
export function flagstoneTexture(size = 512, seed = 3, cells = 7): ProcTexture {
  const pts: { x: number; y: number; id: number }[] = [];
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    pts.push({ x: (i + 0.15 + hash2(i, j, seed) * 0.7) / cells, y: (j + 0.15 + hash2(i, j, seed + 1) * 0.7) / cells, id: hash2(i, j, seed + 2) });
  }
  return make(size, (u, v) => {
    let d1 = 9, d2 = 9, id = 0;
    const ci = Math.floor(u * cells), cj = Math.floor(v * cells);
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      const i = ci + di, j = cj + dj;
      const p = pts[mod(j, cells) * cells + mod(i, cells)]!;
      const px = p.x + Math.floor(i / cells), py = p.y + Math.floor(j / cells);
      const d = Math.hypot(u - px, v - py);
      if (d < d1) { d2 = d1; d1 = d; id = p.id; } else if (d < d2) d2 = d;
    }
    const border = smooth(0.004, 0.018, d2 - d1);
    const veins = fbm(u, v, 24, 4, seed + Math.floor(id * 50));
    const palette: [number, number, number][] = [[196, 168, 124], [176, 150, 112], [158, 140, 118], [205, 186, 150], [140, 120, 96]];
    const c = palette[Math.floor(id * palette.length)]!;
    const t = 0.82 + veins * 0.36;
    const joint: [number, number, number] = [92, 86, 78];
    const h = border * (0.55 + id * 0.25 + veins * 0.2);
    return [c[0] * t * border + joint[0] * (1 - border), c[1] * t * border + joint[1] * (1 - border), c[2] * t * border + joint[2] * (1 - border), h];
  });
}

/** Revoque: grano fino + manchas de humedad/suciedad a baja frecuencia. */
export function plasterTexture(size = 512, seed = 7): ProcTexture {
  return make(size, (u, v) => {
    const grain = fbm(u, v, 64, 3, seed);
    const stain = smooth(0.55, 0.85, fbm(u, v, 3, 4, seed + 3));
    const t = 0.95 + grain * 0.07 - stain * 0.05;
    return [236 * t, 232 * t, 222 * t, grain * 0.6];
  });
}

/** Normal map (RGB 0..255) desde la altura, con wrap (tileable). `strength` en unidades de texel. */
export function normalFromHeight(t: ProcTexture, strength = 4): Uint8Array {
  const { size, height } = t;
  const out = new Uint8Array(size * size * 3);
  const H = (x: number, y: number): number => height[mod(y, size) * size + mod(x, size)]!;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const il = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * size + x) * 3;
      out[i] = Math.round((-dx * il * 0.5 + 0.5) * 255);
      out[i + 1] = Math.round((dy * il * 0.5 + 0.5) * 255); // convención OpenGL (+Y arriba en la imagen invertida)
      out[i + 2] = Math.round((il * 0.5 + 0.5) * 255);
    }
  }
  return out;
}

/** Generadores disponibles por nombre (los usa materials.ts como `proc`). */
export const PROC_TEXTURES = {
  brick: (size: number) => brickTexture(size),
  flagstone: (size: number) => flagstoneTexture(size),
  plaster: (size: number) => plasterTexture(size),
} as const;
export type ProcTextureName = keyof typeof PROC_TEXTURES;
