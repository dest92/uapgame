export interface HeightGrid {
  readonly originX: number;
  readonly originZ: number;
  readonly cellSize: number;
  readonly cols: number;
  readonly rows: number;
  /** Fila mayor (row * cols + col); fila 0 = minZ (norte). */
  readonly heights: readonly number[];
}

export interface HeightSampler {
  heightAt(x: number, z: number): number;
}

/** Campo de alturas con muestreo bilineal (usado por tools, física y render). */
export class HeightField implements HeightSampler {
  constructor(private readonly grid: HeightGrid) {}

  static flat(height = 0): HeightSampler & { normalAt(x: number, z: number): { x: number; y: number; z: number } } {
    return { heightAt: () => height, normalAt: () => ({ x: 0, y: 1, z: 0 }) };
  }

  get data(): HeightGrid {
    return this.grid;
  }

  private at(c: number, r: number): number {
    const { cols, rows, heights } = this.grid;
    const cc = Math.min(cols - 1, Math.max(0, c));
    const rr = Math.min(rows - 1, Math.max(0, r));
    return heights[rr * cols + cc] ?? 0;
  }

  heightAt(x: number, z: number): number {
    const { originX, originZ, cellSize, cols, rows } = this.grid;
    const gx = Math.min(cols - 1, Math.max(0, (x - originX) / cellSize));
    const gz = Math.min(rows - 1, Math.max(0, (z - originZ) / cellSize));
    const c0 = Math.floor(gx);
    const r0 = Math.floor(gz);
    const tx = gx - c0;
    const tz = gz - r0;
    const h00 = this.at(c0, r0);
    const h10 = this.at(c0 + 1, r0);
    const h01 = this.at(c0, r0 + 1);
    const h11 = this.at(c0 + 1, r0 + 1);
    return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
  }

  normalAt(x: number, z: number, eps = 1): { x: number; y: number; z: number } {
    const dx = this.heightAt(x + eps, z) - this.heightAt(x - eps, z);
    const dz = this.heightAt(x, z + eps) - this.heightAt(x, z - eps);
    const nx = -dx;
    const ny = 2 * eps;
    const nz = -dz;
    const len = Math.hypot(nx, ny, nz);
    return { x: nx / len, y: ny / len, z: nz / len };
  }
}

/** Suavizado gaussiano separable (borde replicado). */
export function gaussianSmooth(values: readonly number[], cols: number, rows: number, sigma: number): number[] {
  const radius = Math.max(1, Math.ceil(sigma * 2.5));
  const kernel: number[] = [];
  for (let i = -radius; i <= radius; i++) kernel.push(Math.exp(-(i * i) / (2 * sigma * sigma)));
  const sum = kernel.reduce((a, b) => a + b, 0);
  const k = kernel.map((v) => v / sum);
  const get = (arr: readonly number[], c: number, r: number): number =>
    arr[Math.min(rows - 1, Math.max(0, r)) * cols + Math.min(cols - 1, Math.max(0, c))] ?? 0;

  const tmp = new Array<number>(values.length);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      let acc = 0;
      for (let i = -radius; i <= radius; i++) acc += get(values, c + i, r) * k[i + radius]!;
      tmp[r * cols + c] = acc;
    }
  const out = new Array<number>(values.length);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      let acc = 0;
      for (let i = -radius; i <= radius; i++) acc += get(tmp, c, r + i) * k[i + radius]!;
      out[r * cols + c] = Math.round(acc * 1000) / 1000;
    }
  return out;
}
