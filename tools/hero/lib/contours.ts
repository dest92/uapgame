/**
 * Vectorización de máscaras binarias (marching squares) para extruir letras y logos como
 * geometría real. Puro: sin dependencias de motor.
 */

export interface Pt {
  x: number;
  y: number;
}

/** Contorno cerrado con sus huecos (coordenadas en píxeles, Y hacia abajo). */
export interface Outline {
  readonly outer: Pt[];
  readonly holes: Pt[][];
}

/** Área con signo (positiva = antihoraria con Y hacia arriba). */
export function area(poly: readonly Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

function inside(p: Pt, poly: readonly Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

/** Douglas–Peucker sobre un lazo cerrado. */
export function simplify(loop: readonly Pt[], tol: number): Pt[] {
  if (loop.length < 8) return [...loop];
  const rdp = (pts: readonly Pt[]): Pt[] => {
    if (pts.length < 3) return [...pts];
    const a = pts[0]!;
    const b = pts[pts.length - 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    let best = -1;
    let dmax = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i]!;
      const d = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / l;
      if (d > dmax) { dmax = d; best = i; }
    }
    if (dmax <= tol) return [a, b];
    return [...rdp(pts.slice(0, best + 1)).slice(0, -1), ...rdp(pts.slice(best))];
  };
  const half = Math.floor(loop.length / 2);
  const out = [...rdp(loop.slice(0, half + 1)).slice(0, -1), ...rdp([...loop.slice(half), loop[0]!]).slice(0, -1)];
  return out.length >= 3 ? out : [...loop];
}

/**
 * Contornos de las regiones con valor ≥ umbral. Los lazos se devuelven agrupados en exterior + huecos
 * según su anidamiento (par = exterior, impar = hueco).
 */
export function traceMask(mask: Uint8Array, w: number, h: number, threshold = 128, tol = 0.6): Outline[] {
  const on = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x]! >= threshold;
  // Segmentos dirigidos (región a la izquierda) entre puntos medios de aristas de celda, con clave entera.
  const next = new Map<string, string>();
  const pt = new Map<string, Pt>();
  const key = (x: number, y: number): string => `${x * 2},${y * 2}`;
  const seg = (ax: number, ay: number, bx: number, by: number): void => {
    const ka = key(ax, ay);
    const kb = key(bx, by);
    next.set(ka, kb);
    pt.set(ka, { x: ax, y: ay });
    pt.set(kb, { x: bx, y: by });
  };
  for (let y = -1; y < h; y++) {
    for (let x = -1; x < w; x++) {
      const tl = on(x, y), tr = on(x + 1, y), br = on(x + 1, y + 1), bl = on(x, y + 1);
      const c = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
      const T: [number, number] = [x + 0.5 + 0.5, y + 0.5];
      const R: [number, number] = [x + 1 + 0.5, y + 0.5 + 0.5];
      const B: [number, number] = [x + 0.5 + 0.5, y + 1 + 0.5];
      const L: [number, number] = [x + 0.5, y + 0.5 + 0.5];
      const s = (a: [number, number], b: [number, number]): void => seg(a[0], a[1], b[0], b[1]);
      switch (c) {
        case 1: s(B, L); break;
        case 2: s(R, B); break;
        case 3: s(R, L); break;
        case 4: s(T, R); break;
        case 5: s(T, L); s(B, R); break;
        case 6: s(T, B); break;
        case 7: s(T, L); break;
        case 8: s(L, T); break;
        case 9: s(B, T); break;
        case 10: s(L, B); s(R, T); break;
        case 11: s(R, T); break;
        case 12: s(L, R); break;
        case 13: s(B, R); break;
        case 14: s(L, B); break;
        default: break;
      }
    }
  }
  const loops: Pt[][] = [];
  const seen = new Set<string>();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const loop: Pt[] = [];
    let k: string | undefined = start;
    while (k && !seen.has(k)) {
      seen.add(k);
      loop.push(pt.get(k)!);
      k = next.get(k);
    }
    if (loop.length >= 3) loops.push(simplify(loop, tol));
  }
  const depth = loops.map((l, i) => loops.reduce((d, o, j) => (j !== i && inside(l[0]!, o) ? d + 1 : d), 0));
  const outlines: Outline[] = [];
  loops.forEach((l, i) => {
    if (depth[i]! % 2 === 0) outlines.push({ outer: l, holes: [] });
  });
  loops.forEach((l, i) => {
    if (depth[i]! % 2 === 0) return;
    const parent = outlines.filter((o) => inside(l[0]!, o.outer)).sort((a, b) => Math.abs(area(a.outer)) - Math.abs(area(b.outer)))[0];
    parent?.holes.push(l);
  });
  return outlines;
}
