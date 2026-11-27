/**
 * Piezas paramétricas para hero assets, en un marco local: X a lo largo de la fachada (derecha vista
 * desde afuera), Y arriba (0 = suelo), Z hacia afuera (la cara frontal queda en z = 0).
 * Todas devuelven BufferGeometry no indexada con position/normal/uv (las UV se recalculan al exportar).
 */
import { BoxGeometry, BufferGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Path, Shape, ShapeGeometry, Vector2 } from 'three';
import type { Vec2 } from '@shared/geo/types';

export type OpeningKind = 'rect' | 'pointed' | 'round' | 'gable';

/** Vano en una fachada: `x` = centro, `y` = antepecho (base), medidas en metros. */
export interface Opening {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly kind?: OpeningKind;
}

const prep = (g: BufferGeometry): BufferGeometry => (g.index ? g.toNonIndexed() : g);

/** Contorno de un vano (antihorario en X-Y). Los arcos se discretizan en `seg` tramos por lado. */
export function openingOutline(o: Opening, seg = 8): Vector2[] {
  const x0 = o.x - o.w / 2;
  const x1 = o.x + o.w / 2;
  const kind = o.kind ?? 'rect';
  if (kind === 'rect') return [new Vector2(x0, o.y), new Vector2(x1, o.y), new Vector2(x1, o.y + o.h), new Vector2(x0, o.y + o.h)];
  const pts = [new Vector2(x0, o.y), new Vector2(x1, o.y)];
  if (kind === 'round') {
    const r = o.w / 2;
    const spring = o.y + o.h - r;
    for (let i = 0; i <= seg * 2; i++) {
      const a = (i / (seg * 2)) * Math.PI;
      pts.push(new Vector2(o.x + Math.cos(a) * r, spring + Math.sin(a) * r));
    }
    return pts;
  }
  if (kind === 'gable') {
    const rise = Math.min(o.w * 0.35, o.h * 0.4);
    pts.push(new Vector2(x1, o.y + o.h - rise), new Vector2(o.x, o.y + o.h), new Vector2(x0, o.y + o.h - rise));
    return pts;
  }
  // Arco apuntado (gótico equilátero): dos arcos de radio = ancho centrados en los arranques opuestos.
  const r = o.w;
  const spring = o.y + o.h - r * Math.sin(Math.PI / 3);
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * (Math.PI / 3);
    pts.push(new Vector2(x0 + Math.cos(a) * r, spring + Math.sin(a) * r));
  }
  for (let i = 1; i <= seg; i++) {
    const a = (2 * Math.PI) / 3 + (i / seg) * (Math.PI / 3);
    pts.push(new Vector2(x1 + Math.cos(a) * r, spring + Math.sin(a) * r));
  }
  return pts;
}

/**
 * Losa de muro w×h×t con vanos pasantes reales (las caras de los vanos son el "derrame"). x ∈ [−w/2, w/2].
 * Los vanos que arrancan en la base (puertas) se resuelven como muescas del contorno: un hueco que toca
 * el borde rompe la triangulación.
 */
export function wallSlab(w: number, h: number, t: number, openings: readonly Opening[] = [], y0 = 0): BufferGeometry {
  const doors = openings.filter((o) => o.y <= y0 + 1e-3).sort((a, b) => a.x - b.x);
  const outer = [new Vector2(-w / 2, y0)];
  for (const d of doors) {
    // Contorno del vano sin la base, recorrido de izquierda a derecha.
    const top = openingOutline({ ...d, y: y0 }).slice(2).reverse();
    outer.push(new Vector2(d.x - d.w / 2, y0), ...top, new Vector2(d.x + d.w / 2, y0));
  }
  outer.push(new Vector2(w / 2, y0), new Vector2(w / 2, y0 + h), new Vector2(-w / 2, y0 + h));
  const s = new Shape(outer);
  for (const o of openings) if (o.y > y0 + 1e-3) s.holes.push(new Path(openingOutline(o)));
  const g = new ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -t);
  return prep(g);
}

/** Prisma de perfil arbitrario en X-Y (elevación) con profundidad `d` hacia atrás (z ∈ [−d, 0]). */
export function profilePrism(profile: readonly Vector2[], d: number, holes: readonly Opening[] = []): BufferGeometry {
  const s = new Shape([...profile]);
  for (const o of holes) s.holes.push(new Path(openingOutline(o)));
  const g = new ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -d);
  return prep(g);
}

/** Perfil rectangular w×h con las esquinas superiores redondeadas (radio r). */
export function roundedTopProfile(w: number, h: number, r: number, seg = 8): Vector2[] {
  const pts = [new Vector2(-w / 2, 0), new Vector2(w / 2, 0)];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * (Math.PI / 2);
    pts.push(new Vector2(w / 2 - r + Math.cos(a) * r, h - r + Math.sin(a) * r));
  }
  for (let i = 0; i <= seg; i++) {
    const a = Math.PI / 2 + (i / seg) * (Math.PI / 2);
    pts.push(new Vector2(-w / 2 + r + Math.cos(a) * r, h - r + Math.sin(a) * r));
  }
  return pts;
}

/** Caja con centro en (x, z) y base en y. */
export function box(w: number, h: number, d: number, x = 0, y = 0, z = 0): BufferGeometry {
  const g = new BoxGeometry(w, h, d);
  g.translate(x, y + h / 2, z);
  return prep(g);
}

/** Cilindro vertical con base en y. */
export function cylinder(rTop: number, rBottom: number, h: number, x = 0, y = 0, z = 0, seg = 16): BufferGeometry {
  const g = new CylinderGeometry(rTop, rBottom, h, seg);
  g.translate(x, y + h / 2, z);
  return prep(g);
}

/** Polígono plano (contorno X-Y) a profundidad z, mirando a +Z. */
export function flatShape(outline: readonly Vector2[], z = 0): BufferGeometry {
  const g = new ShapeGeometry(new Shape([...outline]));
  g.translate(0, 0, z);
  return prep(g);
}

/**
 * Prisma vertical de un polígono del plano X-Z (coordenadas del modelo), de y0 a y1, con tapa y fondo.
 * Admite huecos (patios) en `holes`.
 */
export function footprintPrism(poly: readonly Vec2[], y0: number, y1: number, holes: readonly (readonly Vec2[])[] = []): BufferGeometry {
  // Shape en (x, −z); extrusión en +Z local; rotateX(−π/2) lleva (sx, sy, d) → (sx, d, −sy).
  const s = new Shape(poly.map((p) => new Vector2(p.x, -p.z)));
  for (const h of holes) s.holes.push(new Path(h.map((p) => new Vector2(p.x, -p.z))));
  const g = new ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return prep(g);
}

/** Banda (anillo) entre un polígono y su retiro interior: parapetos, cornisas, zócalos. */
export function ringPrism(outer: readonly Vec2[], inner: readonly Vec2[], y0: number, y1: number): BufferGeometry {
  return footprintPrism(outer, y0, y1, [inner]);
}

/**
 * Cinta de sección rectangular barrida a lo largo de una curva del plano X-Y (local): `thickness` en el
 * plano de la curva, `width` en Z (centrada). Para las cintas de hormigón del arco del Pórtico.
 */
export function ribbon(path: readonly Vector2[], width: number, thickness: number): BufferGeometry {
  const n = path.length;
  if (n < 2) throw new Error('ribbon: se necesitan ≥ 2 puntos');
  const normals = path.map((_, i) => {
    const a = path[Math.max(0, i - 1)]!;
    const b = path[Math.min(n - 1, i + 1)]!;
    const t = new Vector2().subVectors(b, a).normalize();
    return new Vector2(-t.y, t.x);
  });
  const pos: number[] = [];
  const hw = width / 2;
  const ht = thickness / 2;
  // Cuatro aristas longitudinales: (offset en normal, z).
  const corners: [number, number][] = [[ht, hw], [ht, -hw], [-ht, -hw], [-ht, hw]];
  const at = (i: number, c: [number, number]): [number, number, number] => {
    const p = path[i]!;
    const nn = normals[i]!;
    return [p.x + nn.x * c[0], p.y + nn.y * c[0], c[1]];
  };
  const quad = (a: number[], b: number[], c: number[], d: number[]): void => {
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  };
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < 4; k++) {
      const c0 = corners[k]!;
      const c1 = corners[(k + 1) % 4]!;
      quad(at(i, c0), at(i + 1, c0), at(i + 1, c1), at(i, c1));
    }
  }
  // Tapas en los extremos.
  quad(at(0, corners[3]!), at(0, corners[2]!), at(0, corners[1]!), at(0, corners[0]!));
  quad(at(n - 1, corners[0]!), at(n - 1, corners[1]!), at(n - 1, corners[2]!), at(n - 1, corners[3]!));
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.setAttribute('uv', new Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  return g;
}

/** Puntos de un arco de elipse (centro, semiejes, ángulos en radianes). */
export function arcPoints(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, seg = 24): Vector2[] {
  return Array.from({ length: seg + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / seg;
    return new Vector2(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  });
}

/** Tronco de pirámide de base cuadrada (pilares del arco). */
export function frustum(base: number, top: number, h: number, x = 0, y = 0, z = 0): BufferGeometry {
  const g = new CylinderGeometry(top / Math.SQRT2, base / Math.SQRT2, h, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(x, y + h / 2, z);
  const out = prep(g);
  out.computeVertexNormals(); // caras planas
  return out;
}
