import type { Vec2 } from './types';

/**
 * Straight skeleton de un polígono simple (sin agujeros) por simulación del frente
 * de onda: todas las aristas avanzan hacia adentro a velocidad 1 y se procesan los
 * eventos de arista (una arista colapsa) y de división (un vértice reflejo toca una
 * arista no adyacente). O(n³), pensado para footprints de edificios (n ≲ 60) y para
 * correr offline en tools/build-world.
 *
 * Convención: entrada en coordenadas del mundo (x = Este, z = Sur) y orden CCW en
 * vista de mapa (como `ensureCCW`). Cada cara corresponde a una arista del contorno:
 * sus nodos empiezan en la arista (i, i+1) y siguen hacia adentro. `t` es la
 * distancia horizontal del nodo a la línea de su arista (altura = t · pendiente).
 */
export interface SkeletonNode {
  readonly x: number;
  readonly z: number;
  readonly t: number;
}

export interface SkeletonFace {
  /** Índice de la arista del contorno (de vértice `edge` a `edge + 1`). */
  readonly edge: number;
  /** Ids de nodos, CCW en vista de mapa; los dos primeros son los extremos de la arista. */
  readonly nodes: readonly number[];
}

export interface Skeleton {
  readonly nodes: readonly SkeletonNode[];
  readonly faces: readonly SkeletonFace[];
}

interface P { x: number; y: number }
interface Edge { d: P; n: P; c: number }
interface Vert { x: number; y: number; vx: number; vy: number; eL: number; eR: number; node: number }
interface Arc { a: number; b: number; f1: number; f2: number }

const EPS = 1e-9;
const SNAP = 1e-5;

/** Velocidad de un vértice entre las aristas `a` (entrante) y `b` (saliente). */
function velocity(ea: Edge, eb: Edge): P {
  const det = ea.n.x * eb.n.y - ea.n.y * eb.n.x;
  if (Math.abs(det) < 1e-9) {
    // Colineales: avanza con la arista. Antiparalelas: frente colapsado (se cierra aparte).
    return ea.n.x * eb.n.x + ea.n.y * eb.n.y > 0 ? { x: ea.n.x, y: ea.n.y } : { x: 0, y: 0 };
  }
  return { x: (eb.n.y - ea.n.y) / det, y: (ea.n.x - eb.n.x) / det };
}

const isReflex = (v: Vert, edges: readonly Edge[]): boolean => {
  const a = edges[v.eL]!.d;
  const b = edges[v.eR]!.d;
  return a.x * b.y - a.y * b.x < -1e-9;
};

type Event =
  | { kind: 'edge'; t: number; loop: number; i: number }
  | { kind: 'split'; t: number; loop: number; r: number; a: number };

export function straightSkeleton(footprint: readonly Vec2[]): Skeleton | null {
  const n = footprint.length;
  if (n < 3) return null;
  // Trabajo interno en (x, y = Norte) con orientación CCW matemática.
  const pts: P[] = footprint.map((p) => ({ x: p.x, y: -p.z }));
  const edges: Edge[] = pts.map((a, i) => {
    const b = pts[(i + 1) % n]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const d = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    const nn = { x: -d.y, y: d.x };
    return { d, n: nn, c: nn.x * a.x + nn.y * a.y };
  });
  const nodes: { x: number; y: number; t: number }[] = pts.map((p) => ({ x: p.x, y: p.y, t: 0 }));
  const arcs: Arc[] = [];
  const addNode = (x: number, y: number, t: number): number => {
    for (let i = n; i < nodes.length; i++) {
      const q = nodes[i]!;
      if (Math.abs(q.x - x) < SNAP && Math.abs(q.y - y) < SNAP && Math.abs(q.t - t) < SNAP) return i;
    }
    nodes.push({ x, y, t });
    return nodes.length - 1;
  };
  const addArc = (a: number, b: number, f1: number, f2: number): void => {
    if (a !== b) arcs.push({ a, b, f1, f2 });
  };
  const makeVert = (x: number, y: number, eL: number, eR: number, node: number): Vert => {
    const v = velocity(edges[eL]!, edges[eR]!);
    return { x, y, vx: v.x, vy: v.y, eL, eR, node };
  };

  let loops: Vert[][] = [pts.map((p, i) => makeVert(p.x, p.y, (i + n - 1) % n, i, i))];
  let T = 0;

  /** Cierra un loop degenerado (≤ 2 vértices o área nula): nodos finales y cumbreras. */
  const closeLoop = (loop: Vert[]): void => {
    const ids = loop.map((v) => {
      const id = addNode(v.x, v.y, T);
      addArc(v.node, id, v.eL, v.eR);
      return id;
    });
    if (loop.length === 2) addArc(ids[0]!, ids[1]!, loop[0]!.eR, loop[1]!.eR);
    else for (let i = 0; i < loop.length; i++) {
      const e = loop[i]!.eR;
      addArc(ids[i]!, ids[(i + 1) % ids.length]!, e, e);
    }
  };
  /** Un loop sin área (todas sus aristas superpuestas) ya terminó de colapsar. */
  const collapsed = (loop: readonly Vert[]): boolean => {
    let area = 0;
    let perim = 0;
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i]!;
      const b = loop[(i + 1) % loop.length]!;
      area += a.x * b.y - b.x * a.y;
      perim += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return Math.abs(area) / 2 < 1e-7 * Math.max(1, perim);
  };

  for (let iter = 0; iter < 20 * n * n && loops.length; iter++) {
    let best: Event | null = null;
    loops.forEach((loop, li) => {
      const m = loop.length;
      for (let i = 0; i < m; i++) {
        const p = loop[i]!;
        const q = loop[(i + 1) % m]!;
        const d = edges[p.eR]!.d;
        const rel = (q.x - p.x) * d.x + (q.y - p.y) * d.y;
        const relv = (q.vx - p.vx) * d.x + (q.vy - p.vy) * d.y;
        if (relv < -EPS) {
          const t = Math.max(0, -rel / relv);
          if (!best || t < best.t - 1e-9) best = { kind: 'edge', t, loop: li, i };
        } else if (Math.abs(rel) < 1e-7) {
          best = { kind: 'edge', t: 0, loop: li, i };
        }
      }
      for (let r = 0; r < m; r++) {
        const v = loop[r]!;
        if (!isReflex(v, edges)) continue;
        for (let a = 0; a < m; a++) {
          const b = (a + 1) % m;
          if (a === r || b === r) continue;
          const k = loop[a]!.eR;
          if (k === v.eL || k === v.eR) continue;
          const e = edges[k]!;
          const gap = e.n.x * v.x + e.n.y * v.y - (e.c + T);
          const closing = 1 - (e.n.x * v.vx + e.n.y * v.vy);
          if (closing < 1e-9 || gap < -1e-7) continue;
          const t = Math.max(0, gap / closing);
          if (best && t >= best.t - 1e-9) continue;
          const hx = v.x + v.vx * t;
          const hy = v.y + v.vy * t;
          const pa = loop[a]!;
          const pb = loop[b]!;
          const ax = pa.x + pa.vx * t, ay = pa.y + pa.vy * t;
          const bx = pb.x + pb.vx * t, by = pb.y + pb.vy * t;
          const len = (bx - ax) * e.d.x + (by - ay) * e.d.y;
          const s = (hx - ax) * e.d.x + (hy - ay) * e.d.y;
          if (len < -1e-7 || s < -1e-6 || s > len + 1e-6) continue;
          best = { kind: 'split', t, loop: li, r, a };
        }
      }
    });
    const found = best as Event | null;
    if (!found) return null;
    const ev: Event = found;
    T += ev.t;
    for (const loop of loops) for (const v of loop) {
      v.x += v.vx * ev.t;
      v.y += v.vy * ev.t;
    }
    const loop = loops[ev.loop]!;
    const m = loop.length;
    const next: Vert[][] = loops.filter((_, i) => i !== ev.loop);
    if (ev.kind === 'edge') {
      const p = loop[ev.i]!;
      const q = loop[(ev.i + 1) % m]!;
      const id = addNode((p.x + q.x) / 2, (p.y + q.y) / 2, T);
      addArc(p.node, id, p.eL, p.eR);
      addArc(q.node, id, q.eL, q.eR);
      const w = makeVert(nodes[id]!.x, nodes[id]!.y, p.eL, q.eR, id);
      const rest: Vert[] = [];
      for (let k = 2; k < m; k++) rest.push(loop[(ev.i + k) % m]!);
      const nl = [w, ...rest];
      if (nl.length >= 3 && p.eL !== q.eR) next.push(nl);
      else closeLoop(nl);
    } else {
      const v = loop[ev.r]!;
      const k = loop[ev.a]!.eR;
      const id = addNode(v.x, v.y, T);
      addArc(v.node, id, v.eL, v.eR);
      const w1 = makeVert(v.x, v.y, v.eL, k, id);
      const w2 = makeVert(v.x, v.y, k, v.eR, id);
      const la: Vert[] = [w1];
      for (let i = (ev.a + 1) % m; i !== ev.r; i = (i + 1) % m) la.push(loop[i]!);
      const lb: Vert[] = [w2];
      for (let i = (ev.r + 1) % m; i !== (ev.a + 1) % m; i = (i + 1) % m) lb.push(loop[i]!);
      for (const nl of [la, lb]) {
        if (nl.length >= 3) next.push(nl);
        else closeLoop(nl);
      }
    }
    loops = [];
    for (const l of next) {
      if (collapsed(l)) closeLoop(l);
      else loops.push(l);
    }
  }
  if (loops.length) return null;
  return assemble(n, nodes, arcs);
}

/** Arma cada cara recorriendo sus arcos desde el final de la arista hasta el inicio. */
function assemble(n: number, raw: readonly { x: number; y: number; t: number }[], arcs: readonly Arc[]): Skeleton | null {
  const faces: SkeletonFace[] = [];
  for (let e = 0; e < n; e++) {
    const A = e;
    const B = (e + 1) % n;
    const own = arcs.filter((a) => a.f1 === e || a.f2 === e);
    const used = new Set<number>();
    const path = [A, B];
    let cur = B;
    let guard = 0;
    while (cur !== A) {
      if (guard++ > own.length + 2) return null;
      let found = -1;
      for (let i = 0; i < own.length; i++) {
        if (used.has(i)) continue;
        const arc = own[i]!;
        if (arc.a === cur || arc.b === cur) {
          const other = arc.a === cur ? arc.b : arc.a;
          // Preferir cerrar contra A; si no, cualquier arco libre.
          if (found < 0 || other === A) found = i;
        }
      }
      if (found < 0) return null;
      used.add(found);
      const arc = own[found]!;
      cur = arc.a === cur ? arc.b : arc.a;
      if (cur !== A) path.push(cur);
    }
    faces.push({ edge: e, nodes: path });
  }
  return { nodes: raw.map((p) => ({ x: p.x, z: -p.y, t: p.t })), faces };
}
