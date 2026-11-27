import { ShapeUtils, Vector2 } from 'three/webgpu';
import type { Vec2 } from '@shared/geo/types';
import { buildRoofMesh } from '@shared/world/roofGeometry';
import type { BuildingData, RoofMaterial, RoofMeshData } from '@shared/world/types';
import { pushVertex, type GeometryData } from '../geometry/GeometryData';

type RGB = readonly [number, number, number];
type V3 = readonly [number, number, number];

/** Id de material de techo que lee el shader (atributo `facade.x`). */
export const ROOF_MATERIAL_ID: Readonly<Record<RoofMaterial, number>> = { tiles: 0, metal: 1, membrane: 2 };
/** `facade.y = 1`: color liso (cenefas, bordes), sin textura de techo. */
export const ROOF_PLAIN = 1;

const FASCIA = 0.22;

const unflat = (a: readonly number[]): V3[] => {
  const out: V3[] = [];
  for (let i = 0; i + 2 < a.length; i += 3) out.push([a[i]!, a[i + 1]!, a[i + 2]!]);
  return out;
};

function newell(poly: readonly V3[]): V3 {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

/** Malla del techo: la de world.json o, si falta (datos viejos/fixtures), calculada acá. */
export function roofMeshOf(b: BuildingData): RoofMeshData | null {
  if (b.roof.mesh) return b.roof.mesh;
  if (b.roof.shape === 'flat' || b.roof.height <= 0) return null;
  const r = buildRoofMesh(b.footprint, b.roof.shape, { pitchDeg: 35, maxHeight: b.roof.height, eave: 0.4 });
  if (!r) return null;
  const flat = (p: readonly V3[]): number[] => p.flatMap((q) => [...q]);
  return { faces: r.faces.map(flat), gables: r.gables.map(flat), trim: r.trim.flatMap(([a, c]) => [...a, ...c]) };
}

/** Triangula un polígono plano 3D proyectándolo sobre su eje dominante; índices orientados con `n`. */
function triangulate(g: GeometryData, pts: readonly V3[], n: V3, vertex: (p: V3) => Parameters<typeof pushVertex>[1]): void {
  const ax = Math.abs(n[0]) > Math.abs(n[1]) && Math.abs(n[0]) > Math.abs(n[2]) ? 0 : Math.abs(n[1]) > Math.abs(n[2]) ? 1 : 2;
  const [i, j] = ax === 0 ? [1, 2] : ax === 1 ? [0, 2] : [0, 1];
  const contour = pts.map((p) => new Vector2(p[i], p[j]));
  const tris = ShapeUtils.triangulateShape(contour, []);
  const base = g.positions.length / 3;
  for (const p of pts) pushVertex(g, vertex(p));
  for (const [a, b, c] of tris) {
    const A = pts[a!]!, B = pts[b!]!, C = pts[c!]!;
    const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
    const v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    const cx = u[1]! * v[2]! - u[2]! * v[1]!, cy = u[2]! * v[0]! - u[0]! * v[2]!, cz = u[0]! * v[1]! - u[1]! * v[0]!;
    if (cx * n[0] + cy * n[1] + cz * n[2] >= 0) g.indices.push(base + a!, base + b!, base + c!);
    else g.indices.push(base + a!, base + c!, base + b!);
  }
}

export interface RoofParts {
  readonly roof: GeometryData;
  /** Hastiales/tímpanos para la malla de muros (flag de pared lisa). */
  readonly gables: GeometryData;
}

/**
 * Faldones (por material), hastiales y cenefa a partir de la malla precalculada.
 * `top` = cota del tope de muros.
 */
export function appendPitchedRoof(
  out: RoofParts, b: BuildingData, mesh: RoofMeshData, top: number, groundY: number,
  colors: { roof: RGB; wall: RGB; trim: RGB },
): void {
  const mat = ROOF_MATERIAL_ID[b.roof.material ?? (b.roof.shape === 'flat' ? 'membrane' : 'metal')];
  for (const flat of mesh.faces) {
    const pts = unflat(flat).map((p): V3 => [p[0], p[1] + top, p[2]]);
    let n = newell(pts);
    if (n[1] < 0) n = [-n[0], -n[1], -n[2]];
    triangulate(out.roof, pts, n, (p) => ({ p, n, uv: [p[0], p[2]], color: colors.roof, extra: [mat, 0, 0] }));
  }
  const c = b.centroid;
  for (const flat of mesh.gables) {
    const pts = unflat(flat).map((p): V3 => [p[0], p[1] + top, p[2]]);
    let n = newell(pts);
    n = [n[0], 0, n[2]];
    const l = Math.hypot(n[0], n[2]) || 1;
    n = [n[0] / l, 0, n[2] / l];
    const mid = pts.reduce((s, p) => [s[0] + p[0] / pts.length, 0, s[2] + p[2] / pts.length], [0, 0, 0]);
    if ((mid[0] - c.x) * n[0] + (mid[2] - c.z) * n[2] < 0) n = [-n[0], 0, -n[2]];
    // UV de pared: u a lo largo del hastial, v desde la cota base (como el resto del muro).
    const dir: Vec2 = { x: -n[2], z: n[0] };
    const u0 = Math.min(...pts.map((p) => p[0] * dir.x + p[2] * dir.z));
    const width = Math.max(...pts.map((p) => p[0] * dir.x + p[2] * dir.z)) - u0;
    const h = Math.max(...pts.map((p) => p[1])) - groundY;
    triangulate(out.gables, pts, n, (p) => ({
      p, n, uv: [p[0] * dir.x + p[2] * dir.z - u0, p[1] - groundY], color: colors.wall, extra: [width, h, 1],
    }));
  }
  // Cenefa: tabla vertical bajo cada borde libre, hacia afuera del edificio.
  const t = mesh.trim;
  for (let i = 0; i + 5 < t.length; i += 6) {
    const a: V3 = [t[i]!, t[i + 1]! + top, t[i + 2]!];
    const e: V3 = [t[i + 3]!, t[i + 4]! + top, t[i + 5]!];
    const dx = e[0] - a[0], dz = e[2] - a[2];
    const l = Math.hypot(dx, dz);
    if (l < 1e-3) continue;
    let nx = -dz / l, nz = dx / l;
    const mx = (a[0] + e[0]) / 2 - c.x, mz = (a[2] + e[2]) / 2 - c.z;
    if (mx * nx + mz * nz < 0) { nx = -nx; nz = -nz; }
    const o = 0.03;
    const q = (p: V3, dy: number, off: number): V3 => [p[0] + nx * off, p[1] + dy, p[2] + nz * off];
    const quads: [V3, V3, V3, V3, V3][] = [
      [q(a, -FASCIA, o), q(e, -FASCIA, o), q(e, 0.02, o), q(a, 0.02, o), [nx, 0, nz]],
      [q(e, -FASCIA, -0.02), q(a, -FASCIA, -0.02), q(a, 0.02, -0.02), q(e, 0.02, -0.02), [-nx, 0, -nz]],
      [q(a, -FASCIA, -0.02), q(e, -FASCIA, -0.02), q(e, -FASCIA, o), q(a, -FASCIA, o), [0, -1, 0]],
    ];
    for (const [p0, p1, p2, p3, n] of quads) {
      const base = out.roof.positions.length / 3;
      for (const p of [p0, p1, p2, p3]) pushVertex(out.roof, { p, n, uv: [p[0], p[2]], color: colors.trim, extra: [mat, ROOF_PLAIN, 0] });
      const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
      const v = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
      const dot = (u[1]! * v[2]! - u[2]! * v[1]!) * n[0] + (u[2]! * v[0]! - u[0]! * v[2]!) * n[1] + (u[0]! * v[1]! - u[1]! * v[0]!) * n[2];
      if (dot >= 0) out.roof.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      else out.roof.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
  }
}
