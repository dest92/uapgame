import { ShapeUtils, Vector2 } from 'three/webgpu';
import type { Vec2 } from '@shared/geo/types';
import type { BuildingData } from '@shared/world/types';
import { emptyGeometry, pushVertex, type GeometryData } from '../geometry/GeometryData';
import { appendGeometry } from '../geometry/GeometryData';
import { hexToLinear } from './color';
import { buildFacadeDetail, type FacadeDetail } from './FacadeDetailBuilder';
import { appendPitchedRoof, ROOF_MATERIAL_ID, ROOF_PLAIN, roofMeshOf } from './RoofBuilder';

export const FOUNDATION = 1.5;
const PARAPET = 0.6;

export interface BuildingGeometry extends FacadeDetail {
  /**
   * Paredes del LOD lejano (ventanas pintadas por shader). `extra` = (largo de pared,
   * altura de pared, flag: 0 ventanas pintadas, 1 liso, 2 cercano con chorreaduras).
   */
  readonly far: GeometryData;
  /** Alias de `far` (compatibilidad). */
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

/**
 * Genera muros (LOD lejano y cercano), techo y molduras de un edificio procedural
 * (spec 003/009, ROOF-*, FAC-*). `groundY`: terreno bajo el edificio (mínimo del
 * footprint); `doorGround`: terreno en la entrada.
 */
export function buildBuildingGeometry(b: BuildingData, groundY: number, doorGround = groundY): BuildingGeometry {
  const far = emptyGeometry();
  const roof = emptyGeometry();
  const wallColor = hexToLinear(b.appearance.wallColor);
  const roofColor = hexToLinear(b.appearance.roofColor);
  const trimColor = hexToLinear(b.appearance.trimColor);
  const top = groundY + b.height;
  const fp = b.footprint;
  const mesh = roofMeshOf(b);
  const wallTop = mesh ? top : top + PARAPET;
  const wallBottom = groundY - FOUNDATION + b.minHeight;

  for (let i = 0; i < fp.length; i++) {
    const a = fp[i]!;
    const c = fp[(i + 1) % fp.length]!;
    wallQuad(far, a, c, wallBottom, wallTop, outward(a, c), wallColor, 0, groundY);
  }
  const plinth: RGB = b.appearance.wallMaterial === 'brick' ? [0.12, 0.115, 0.11] : [wallColor[0] * 0.45, wallColor[1] * 0.45, wallColor[2] * 0.45];
  const detail = buildFacadeDetail({
    b, groundY, doorGround, wallBottom, wallTop, top, flat: !mesh,
    colors: { wall: wallColor, trim: trimColor, plinth, frame: b.kind === 'industrial' ? [0.25, 0.27, 0.28] : [0.62, 0.64, 0.65] },
  });

  if (mesh) {
    const gables = emptyGeometry();
    appendPitchedRoof({ roof, gables }, b, mesh, top, groundY, { roof: roofColor, wall: wallColor, trim: trimColor });
    appendGeometry(far, gables);
    appendGeometry(detail.walls, gables);
    return { ...detail, far, walls: far, roof };
  }

  // Techo plano con parapeto: cara interior + borde superior + losa.
  const inner = inset(fp, 0.25);
  const innerWalls = emptyGeometry();
  for (let i = 0; i < inner.length; i++) {
    const a = inner[i]!;
    const c = inner[(i + 1) % inner.length]!;
    const n = outward(a, c);
    wallQuad(innerWalls, c, a, top, wallTop, { x: -n.x, z: -n.z }, wallColor, 1, groundY);
  }
  appendGeometry(far, innerWalls);
  appendGeometry(detail.walls, innerWalls);
  ringCap(roof, fp, inner, wallTop, wallColor);
  const ringVerts = roof.positions.length / 3;
  flatCap(roof, inner, top + 0.02, roofColor);
  const id = ROOF_MATERIAL_ID[b.roof.material ?? 'membrane'];
  for (let v = 0; v < roof.extra.length / 3; v++) {
    roof.extra[v * 3] = id;
    // El borde del parapeto lleva color liso (lo tapa el coronamiento).
    if (v < ringVerts) roof.extra[v * 3 + 1] = ROOF_PLAIN;
  }
  return { ...detail, far, walls: far, roof };
}
