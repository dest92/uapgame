import { ShapeUtils, Vector2 } from 'three/webgpu';
import type { Vec2 } from '@shared/geo/types';
import type { BuildingData } from '@shared/world/types';
import { emptyGeometry, pushVertex, type GeometryData } from '../geometry/GeometryData';
import { hexToLinear } from './color';
import { orientedBox, type OrientedBox } from './obb';

const FOUNDATION = 1.5;
const PARAPET = 0.6;
const EAVE = 0.45;
const MIN_RECTANGULARITY = 0.78;

export interface BuildingGeometry {
  /** Paredes. `extra` = (largo de pared, altura de pared, 1 si es cara interior/gablete). */
  readonly walls: GeometryData;
  readonly roof: GeometryData;
}

type RGB = readonly [number, number, number];

function outward(a: Vec2, b: Vec2): Vec2 {
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return { x: -(b.z - a.z) / len, z: (b.x - a.x) / len };
}

/** Quad vertical a→b entre y0 e y1 con normal `n`. */
function wallQuad(g: GeometryData, a: Vec2, b: Vec2, y0: number, y1: number, n: Vec2, color: RGB, flag: number, vBase: number): void {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const extra = [len, y1 - vBase, flag] as const;
  const nn = [n.x, 0, n.z] as const;
  const i0 = pushVertex(g, { p: [a.x, y0, a.z], n: nn, uv: [0, y0 - vBase], color, extra });
  const i1 = pushVertex(g, { p: [b.x, y0, b.z], n: nn, uv: [len, y0 - vBase], color, extra });
  const i2 = pushVertex(g, { p: [b.x, y1, b.z], n: nn, uv: [len, y1 - vBase], color, extra });
  const i3 = pushVertex(g, { p: [a.x, y1, a.z], n: nn, uv: [0, y1 - vBase], color, extra });
  g.indices.push(i0, i1, i2, i0, i2, i3);
}

function flatCap(g: GeometryData, poly: readonly Vec2[], y: number, color: RGB): void {
  // Shape en (x, norte=-z): CCW en vista mapa ⇒ CCW para Earcut.
  const contour = poly.map((p) => new Vector2(p.x, -p.z));
  const tris = ShapeUtils.triangulateShape(contour, []);
  const base = g.positions.length / 3;
  for (const p of poly) pushVertex(g, { p: [p.x, y, p.z], n: [0, 1, 0], uv: [p.x, p.z], color });
  for (const [a, b, c] of tris) g.indices.push(base + a!, base + b!, base + c!);
}

/** Anillo entre `outer` e `inner` (borde superior del parapeto). */
function ringCap(g: GeometryData, outer: readonly Vec2[], inner: readonly Vec2[], y: number, color: RGB): void {
  const contour = outer.map((p) => new Vector2(p.x, -p.z));
  const hole = [...inner].reverse().map((p) => new Vector2(p.x, -p.z));
  const tris = ShapeUtils.triangulateShape(contour, [hole]);
  const base = g.positions.length / 3;
  for (const p of [...outer, ...[...inner].reverse()]) pushVertex(g, { p: [p.x, y, p.z], n: [0, 1, 0], uv: [p.x, p.z], color });
  for (const [a, b, c] of tris) g.indices.push(base + a!, base + b!, base + c!);
}

/** Inset simple por vértice (bisectriz). Suficiente para parapetos delgados. */
function inset(poly: readonly Vec2[], d: number): Vec2[] {
  return poly.map((p, i) => {
    const prev = poly[(i + poly.length - 1) % poly.length]!;
    const next = poly[(i + 1) % poly.length]!;
    const n1 = outward(prev, p);
    const n2 = outward(p, next);
    const bx = n1.x + n2.x;
    const bz = n1.z + n2.z;
    const bl = Math.hypot(bx, bz) || 1;
    const cos = Math.max(0.35, (bx / bl) * n1.x + (bz / bl) * n1.z);
    return { x: p.x - (bx / bl) * (d / cos), z: p.z - (bz / bl) * (d / cos) };
  });
}

const at = (o: OrientedBox, su: number, sv: number, grow = 0): Vec2 => ({
  x: o.center.x + o.u.x * su * (o.halfU + grow) + o.v.x * sv * (o.halfV + grow),
  z: o.center.z + o.u.z * su * (o.halfU + grow) + o.v.z * sv * (o.halfV + grow),
});

function slopedQuad(g: GeometryData, pts: readonly [number, number, number][], color: RGB): void {
  const [a, b, c] = pts as [[number, number, number], [number, number, number], [number, number, number]];
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  let n: [number, number, number] = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
  const len = Math.hypot(...n) || 1;
  n = [n[0] / len, n[1] / len, n[2] / len];
  if (n[1] < 0) n = [-n[0], -n[1], -n[2]];
  const base = g.positions.length / 3;
  for (const p of pts) pushVertex(g, { p, n, uv: [p[0], p[2]], color });
  // Orientar triángulos para que la cara frontal mire hacia la normal (+Y).
  const cross = u[2]! * v[0]! - u[0]! * v[2]!;
  const flip = cross < 0;
  for (let i = 1; i < pts.length - 1; i++) {
    if (flip) g.indices.push(base, base + i + 1, base + i);
    else g.indices.push(base, base + i, base + i + 1);
  }
}

function pitchedRoof(walls: GeometryData, roof: GeometryData, o: OrientedBox, top: number, h: number, hipped: boolean, wallColor: RGB, roofColor: RGB): void {
  const ridgeInset = hipped ? Math.min(o.halfV, o.halfU * 0.9) : -EAVE;
  const r1: [number, number, number] = [
    o.center.x - o.u.x * (o.halfU - ridgeInset), top + h, o.center.z - o.u.z * (o.halfU - ridgeInset),
  ];
  const r2: [number, number, number] = [
    o.center.x + o.u.x * (o.halfU - ridgeInset), top + h, o.center.z + o.u.z * (o.halfU - ridgeInset),
  ];
  const eaveDrop = (EAVE / Math.max(o.halfV, 0.1)) * h;
  const c = (su: number, sv: number): [number, number, number] => {
    const p = at(o, su, sv, EAVE);
    return [p.x, top - eaveDrop, p.z];
  };
  slopedQuad(roof, [c(-1, -1), c(1, -1), r2, r1], roofColor);
  slopedQuad(roof, [c(1, 1), c(-1, 1), r1, r2], roofColor);
  if (hipped) {
    slopedQuad(roof, [c(-1, 1), c(-1, -1), r1], roofColor);
    slopedQuad(roof, [c(1, -1), c(1, 1), r2], roofColor);
    return;
  }
  // Gabletes (triángulos de pared en los extremos).
  for (const su of [-1, 1] as const) {
    const a = at(o, su, -1);
    const b = at(o, su, 1);
    const ridge = { x: o.center.x + o.u.x * su * o.halfU, z: o.center.z + o.u.z * su * o.halfU };
    const n = { x: o.u.x * su, z: o.u.z * su };
    const extra = [o.halfV * 2, h, 1] as const;
    const nn = [n.x, 0, n.z] as const;
    const [p, q] = su === 1 ? [a, b] : [b, a];
    const i0 = pushVertex(walls, { p: [p.x, top, p.z], n: nn, uv: [0, 0], color: wallColor, extra });
    const i1 = pushVertex(walls, { p: [q.x, top, q.z], n: nn, uv: [o.halfV * 2, 0], color: wallColor, extra });
    const i2 = pushVertex(walls, { p: [ridge.x, top + h, ridge.z], n: nn, uv: [o.halfV, h], color: wallColor, extra });
    walls.indices.push(i0, i1, i2);
  }
}

/**
 * Genera paredes y techo de un edificio procedural (spec 003/009).
 * `groundY`: altura del terreno bajo el edificio (mínimo del footprint).
 */
export function buildBuildingGeometry(b: BuildingData, groundY: number): BuildingGeometry {
  const walls = emptyGeometry();
  const roof = emptyGeometry();
  const wallColor = hexToLinear(b.appearance.wallColor);
  const roofColor = hexToLinear(b.appearance.roofColor);
  const top = groundY + b.height;
  const fp = b.footprint;
  const obb = orientedBox(fp);
  const pitched = b.roof.shape !== 'flat' && b.roof.height > 0 && obb.rectangularity >= MIN_RECTANGULARITY;
  const wallTop = pitched ? top : top + PARAPET;

  for (let i = 0; i < fp.length; i++) {
    const a = fp[i]!;
    const c = fp[(i + 1) % fp.length]!;
    wallQuad(walls, a, c, groundY - FOUNDATION + b.minHeight, wallTop, outward(a, c), wallColor, 0, groundY);
  }

  if (pitched) {
    const hipped = b.roof.shape === 'hipped' || b.roof.shape === 'pyramidal' || b.roof.shape === 'dome';
    pitchedRoof(walls, roof, obb, top, b.roof.height, hipped, wallColor, roofColor);
    return { walls, roof };
  }

  // Techo plano con parapeto: cara interior + borde superior + losa.
  const inner = inset(fp, 0.25);
  for (let i = 0; i < inner.length; i++) {
    const a = inner[i]!;
    const c = inner[(i + 1) % inner.length]!;
    const n = outward(a, c);
    wallQuad(walls, c, a, top, wallTop, { x: -n.x, z: -n.z }, wallColor, 1, groundY);
  }
  ringCap(roof, fp, inner, wallTop, wallColor);
  flatCap(roof, inner, top + 0.02, roofColor);
  return { walls, roof };
}
