import type { Vec2 } from '@shared/geo/types';
import { closestPointOnSegment, distance } from '@shared/geo/polygon';
import { layoutWall, solidRects, type Opening } from '@shared/world/facadeGrammar';
import type { BuildingData } from '@shared/world/types';
import { emptyGeometry, type GeometryData } from '../geometry/GeometryData';
import { box, isConvex, quad, wallFrame, type WallFrame } from './kit';

type RGB = readonly [number, number, number];

/** Retiro de ventana y de puerta (m). */
export const WIN_DEPTH = 0.18;
export const DOOR_DEPTH = 0.26;
const FRAME = 0.06;
/** `facade.z` de muros cercanos: sin ventanas pintadas, con chorreaduras. */
export const FLAG_NEAR = 2;
export const FLAG_PLAIN = 1;

export interface FacadeDetail {
  /** LOD cercano: muro con huecos, retiros, marcos, alféizares, dinteles, puerta. */
  readonly walls: GeometryData;
  readonly trim: GeometryData;
  readonly glass: GeometryData;
  /** Siempre visibles: zócalo, cornisa/coronamiento, pilastras de esquina, marquesina. */
  readonly trimAlways: GeometryData;
}

export interface FacadeInput {
  readonly b: BuildingData;
  readonly groundY: number;
  /** Cota del terreno en la entrada (para el umbral de la puerta). */
  readonly doorGround: number;
  readonly wallBottom: number;
  readonly wallTop: number;
  /** Cota del tope de muros sin parapeto. */
  readonly top: number;
  readonly flat: boolean;
  readonly colors: { readonly wall: RGB; readonly trim: RGB; readonly plinth: RGB; readonly frame: RGB };
}

const hash = (a: number, b: number, c: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Arista más cercana a la entrada y posición u de la puerta sobre ella. */
export function doorEdge(b: BuildingData): { edge: number; u: number } {
  const fp = b.footprint;
  let edge = 0;
  let best = Infinity;
  for (let i = 0; i < fp.length; i++) {
    const d = distance(closestPointOnSegment(b.entrance.position, fp[i]!, fp[(i + 1) % fp.length]!), b.entrance.position);
    if (d < best) { best = d; edge = i; }
  }
  const a = fp[edge]!;
  const f = wallFrame(a, fp[(edge + 1) % fp.length]!);
  const u = (b.entrance.position.x - a.x) * f.d.x + (b.entrance.position.z - a.z) * f.d.z;
  return { edge, u };
}

function opening(g: FacadeDetail, f: WallFrame, o: Opening, inp: FacadeInput, wallExtra: [number, number, number], seed: number): void {
  const y0 = inp.groundY + o.v0;
  const y1 = inp.groundY + o.v1;
  const { u0, u1 } = o;
  const D = o.kind === 'door' ? DOOR_DEPTH : WIN_DEPTH;
  const plain = { color: inp.colors.wall, extra: [wallExtra[0], wallExtra[1], FLAG_PLAIN] as [number, number, number] };
  // Retiros (jambas, dintel interior, antepecho): muro liso mirando hacia el vano.
  quad(g.walls, f, [[u0, y0, 0], [u0, y0, -D], [u0, y1, -D], [u0, y1, 0]], [1, 0, 0], plain, [[0, o.v0], [D, o.v0], [D, o.v1], [0, o.v1]]);
  quad(g.walls, f, [[u1, y0, -D], [u1, y0, 0], [u1, y1, 0], [u1, y1, -D]], [-1, 0, 0], plain, [[D, o.v0], [0, o.v0], [0, o.v1], [D, o.v1]]);
  quad(g.walls, f, [[u0, y1, 0], [u0, y1, -D], [u1, y1, -D], [u1, y1, 0]], [0, -1, 0], plain);
  quad(g.walls, f, [[u0, y0, -D], [u0, y0, 0], [u1, y0, 0], [u1, y0, -D]], [0, 1, 0], plain);
  const frame = { color: inp.colors.frame };
  const wg = -D + 0.05;
  const glass = { color: [seed, o.kind === 'door' ? 1 : 0, o.level] as [number, number, number] };
  // Marco perimetral + parantes; vidrio detrás.
  box(g.trim, f, u0, u1, y0, y0 + FRAME, -D, -D + 0.09, frame, { back: true });
  box(g.trim, f, u0, u1, y1 - FRAME, y1, -D, -D + 0.09, frame, { back: true });
  box(g.trim, f, u0, u0 + FRAME, y0 + FRAME, y1 - FRAME, -D, -D + 0.09, frame, { back: true, top: true, bottom: true });
  box(g.trim, f, u1 - FRAME, u1, y0 + FRAME, y1 - FRAME, -D, -D + 0.09, frame, { back: true, top: true, bottom: true });
  const mid = (u0 + u1) / 2;
  if (u1 - u0 > 1.1) box(g.trim, f, mid - 0.03, mid + 0.03, y0 + FRAME, y1 - FRAME, -D + 0.01, -D + 0.08, frame, { back: true, top: true, bottom: true });
  if (o.kind === 'window' && y1 - y0 > 1.3) {
    const yt = y1 - (y1 - y0) * 0.3;
    box(g.trim, f, u0 + FRAME, u1 - FRAME, yt - 0.025, yt + 0.025, -D + 0.01, -D + 0.08, frame, { back: true });
  }
  quad(g.glass, f, [[u0 + FRAME, y0 + FRAME, wg], [u1 - FRAME, y0 + FRAME, wg], [u1 - FRAME, y1 - FRAME, wg], [u0 + FRAME, y1 - FRAME, wg]], [0, 0, 1], glass,
    [[0, 0], [1, 0], [1, 1], [0, 1]]);
  const trim = { color: inp.colors.trim };
  if (o.kind === 'window') {
    // Alféizar que sobresale y gotea; dintel apenas saliente.
    box(g.trim, f, u0 - 0.07, u1 + 0.07, y0 - 0.06, y0 + 0.005, -D + 0.09, 0.07, trim, { back: true });
    box(g.trim, f, u0 - 0.1, u1 + 0.1, y1, y1 + 0.16, 0, 0.025, trim, { back: true });
  } else {
    // Umbral/escalón y marquesina sobre la puerta.
    box(g.trimAlways, f, u0 - 0.45, u1 + 0.45, y0 - 0.45, y0, -D, 0.7, { color: inp.colors.plinth }, { back: true, bottom: true });
    box(g.trimAlways, f, u0 - 0.6, u1 + 0.6, y1 + 0.32, y1 + 0.46, 0, 1.35, trim, { back: true });
  }
}

/** Geometría de fachada de un edificio a partir de la gramática (FAC-1..4). */
export function buildFacadeDetail(inp: FacadeInput): FacadeDetail {
  const g: FacadeDetail = { walls: emptyGeometry(), trim: emptyGeometry(), glass: emptyGeometry(), trimAlways: emptyGeometry() };
  const { b, groundY } = inp;
  const fp = b.footprint;
  const n = fp.length;
  const door = doorEdge(b);
  const wallH = inp.wallTop - groundY;
  const corners = fp.map((p, i) => isConvex(fp[(i + n - 1) % n]!, p, fp[(i + 1) % n]!));
  for (let i = 0; i < n; i++) {
    const a: Vec2 = fp[i]!;
    const c: Vec2 = fp[(i + 1) % n]!;
    const f = wallFrame(a, c);
    const L = f.length;
    const isDoor = i === door.edge;
    const layout = layoutWall({
      length: L, height: wallH,
      ...(isDoor ? { doorU: door.u, doorV: Math.min(1.2, Math.max(0, inp.doorGround - groundY)) } : {}),
    });
    const extra: [number, number, number] = [L, wallH, FLAG_NEAR];
    for (const r of solidRects(L, inp.wallBottom - groundY, wallH, layout.openings)) {
      quad(g.walls, f, [[r.u0, groundY + r.v0, 0], [r.u1, groundY + r.v0, 0], [r.u1, groundY + r.v1, 0], [r.u0, groundY + r.v1, 0]], [0, 0, 1],
        { color: inp.colors.wall, extra }, [[r.u0, r.v0], [r.u1, r.v0], [r.u1, r.v1], [r.u0, r.v1]]);
    }
    for (const o of layout.openings) opening(g, f, o, inp, extra, hash(a.x + o.bay, a.z + o.level, b.centroid.x));

    // Extensión en esquinas: convexas se prolongan para cerrar el encuentro; cóncavas se acortan.
    const ext = (w: number): [number, number] => [corners[i]! ? w : -w, corners[(i + 1) % n]! ? w : -w];
    // Zócalo (cortado en la puerta).
    const [pa, pb] = ext(0.05);
    const doorOp = layout.openings.find((o) => o.kind === 'door');
    const plinthTop = groundY + 0.55;
    const plinth = { color: inp.colors.plinth };
    const spans: [number, number][] = doorOp ? [[-pa, doorOp.u0], [doorOp.u1, L + pb]] : [[-pa, L + pb]];
    for (const [s0, s1] of spans) if (s1 > s0) box(g.trimAlways, f, s0, s1, inp.wallBottom, plinthTop, -0.01, 0.05, plinth, { back: true, bottom: true });
    const trim = { color: inp.colors.trim };
    if (inp.flat) {
      // Coronamiento del parapeto + banda de losa.
      const [ca, cb] = ext(0.09);
      box(g.trimAlways, f, -ca, L + cb, inp.wallTop - 0.05, inp.wallTop + 0.06, -0.3, 0.09, trim, { back: true });
      const [ba, bb] = ext(0.1);
      box(g.trimAlways, f, -ba, L + bb, inp.top - 0.32, inp.top - 0.04, -0.01, 0.1, trim, { back: true });
    } else {
      const [ba, bb] = ext(0.04);
      box(g.trimAlways, f, -ba, L + bb, inp.top - 0.28, inp.top, -0.01, 0.04, trim, { back: true });
    }
    // Pilastras en esquinas convexas (bordes marcados).
    const pilTop = inp.flat ? inp.top - 0.32 : inp.top - 0.28;
    if (b.appearance.wallMaterial !== 'glass' && L > 2) {
      if (corners[i]) box(g.trimAlways, f, -0.035, 0.32, plinthTop, pilTop, -0.01, 0.035, trim, { back: true, top: true, bottom: true });
      if (corners[(i + 1) % n]) box(g.trimAlways, f, L - 0.32, L + 0.035, plinthTop, pilTop, -0.01, 0.035, trim, { back: true, top: true, bottom: true });
    }
  }
  return g;
}
