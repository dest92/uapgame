/**
 * Gramática de fachada (FAC-1..4). Divide cada pared en pisos y bahías y devuelve los
 * vanos (ventanas y puerta) como rectángulos en coordenadas de pared: u = metros a lo
 * largo de la arista desde su inicio, v = metros sobre la cota base del edificio.
 *
 * El shader de fachada lejano (`facadeNode.ts`) pinta la MISMA grilla con estas
 * constantes: así la geometría cercana y el shader lejano coinciden.
 */
export const FACADE = {
  /** Altura de piso. */
  LEVEL: 3.2,
  /** Ancho de bahía (módulo de ventana). */
  BAY: 3.3,
  WIN_W: 1.5,
  /** Alféizar y dintel relativos al piso. */
  SILL: 0.95,
  HEAD: 2.45,
  /** Margen libre bajo el tope del muro. */
  TOP_MARGIN: 0.7,
  /** Paredes más cortas no llevan ventanas. */
  MIN_WALL: 2.6,
  DOOR_W: 1.8,
  DOOR_H: 2.5,
} as const;

export type OpeningKind = 'window' | 'door';

export interface Opening {
  readonly kind: OpeningKind;
  readonly u0: number;
  readonly u1: number;
  readonly v0: number;
  readonly v1: number;
  readonly level: number;
  readonly bay: number;
}

export interface WallLayout {
  readonly bays: number;
  /** Margen a cada lado de la grilla de bahías. */
  readonly offset: number;
  readonly openings: readonly Opening[];
}

export interface WallSpec {
  readonly length: number;
  /** Altura del muro sobre la cota base (incluye parapeto). */
  readonly height: number;
  /** Posición u del centro de la puerta en esta pared, si la tiene. */
  readonly doorU?: number;
  /** Cota del umbral de la puerta (v), si el terreno sube en la entrada. */
  readonly doorV?: number;
}

/** Disposición de vanos de una pared. Las ventanas nunca se salen de la pared. */
export function layoutWall(w: WallSpec): WallLayout {
  const { BAY, LEVEL, WIN_W, SILL, HEAD, TOP_MARGIN, MIN_WALL, DOOR_W, DOOR_H } = FACADE;
  const bays = w.length >= MIN_WALL ? Math.floor(w.length / BAY) : 0;
  const offset = (w.length - bays * BAY) / 2;
  const openings: Opening[] = [];
  let doorBay = -1;
  if (w.doorU !== undefined && w.length >= DOOR_W + 0.4) {
    // La puerta se alinea con la bahía más cercana (o se centra si no hay bahías).
    let center = w.doorU;
    if (bays > 0) {
      doorBay = Math.min(bays - 1, Math.max(0, Math.floor((w.doorU - offset) / BAY)));
      center = offset + (doorBay + 0.5) * BAY;
    }
    center = Math.min(w.length - DOOR_W / 2 - 0.2, Math.max(DOOR_W / 2 + 0.2, center));
    const v0 = Math.max(0, w.doorV ?? 0);
    if (v0 + DOOR_H <= w.height - 0.3) {
      openings.push({ kind: 'door', u0: center - DOOR_W / 2, u1: center + DOOR_W / 2, v0, v1: v0 + DOOR_H, level: 0, bay: doorBay });
    } else {
      doorBay = -1;
    }
  }
  for (let level = 0; level * LEVEL + HEAD <= w.height - TOP_MARGIN + 1e-6; level++) {
    for (let bay = 0; bay < bays; bay++) {
      if (level === 0 && bay === doorBay) continue;
      const c = offset + (bay + 0.5) * BAY;
      openings.push({
        kind: 'window', u0: c - WIN_W / 2, u1: c + WIN_W / 2,
        v0: level * LEVEL + SILL, v1: level * LEVEL + HEAD, level, bay,
      });
    }
  }
  return { bays, offset, openings };
}

/**
 * Rectángulos de muro macizo que quedan alrededor de los vanos (para la geometría con
 * huecos). Cubren exactamente [0, length] × [vBottom, vTop] menos los vanos.
 */
export function solidRects(length: number, vBottom: number, vTop: number, holes: readonly Opening[]): { u0: number; u1: number; v0: number; v1: number }[] {
  const vs = new Set([vBottom, vTop]);
  for (const h of holes) {
    if (h.v0 > vBottom && h.v0 < vTop) vs.add(h.v0);
    if (h.v1 > vBottom && h.v1 < vTop) vs.add(h.v1);
  }
  const ys = [...vs].sort((a, b) => a - b);
  const out: { u0: number; u1: number; v0: number; v1: number }[] = [];
  for (let i = 0; i + 1 < ys.length; i++) {
    const v0 = ys[i]!;
    const v1 = ys[i + 1]!;
    const mid = (v0 + v1) / 2;
    const cut = holes.filter((h) => h.v0 <= mid && h.v1 >= mid).sort((a, b) => a.u0 - b.u0);
    let u = 0;
    for (const h of cut) {
      if (h.u0 > u) out.push({ u0: u, u1: h.u0, v0, v1 });
      u = Math.max(u, h.u1);
    }
    if (u < length) out.push({ u0: u, u1: length, v0, v1 });
  }
  return out;
}
