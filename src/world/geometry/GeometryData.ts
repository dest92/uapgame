import { BufferAttribute, BufferGeometry } from 'three/webgpu';

/** Geometría como arrays planos: fácil de testear y de fusionar. */
export interface GeometryData {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  /** RGB lineal por vértice (tinte de material). */
  colors: number[];
  /** Atributo libre vec3 por vértice (p.ej. datos de fachada). */
  extra: number[];
}

export const emptyGeometry = (): GeometryData => ({ positions: [], normals: [], uvs: [], indices: [], colors: [], extra: [] });

export interface VertexInit {
  readonly p: readonly [number, number, number];
  readonly n: readonly [number, number, number];
  readonly uv: readonly [number, number];
  readonly color: readonly [number, number, number];
  readonly extra?: readonly [number, number, number];
}

export function pushVertex(g: GeometryData, v: VertexInit): number {
  const index = g.positions.length / 3;
  g.positions.push(...v.p);
  g.normals.push(...v.n);
  g.uvs.push(...v.uv);
  g.colors.push(...v.color);
  g.extra.push(...(v.extra ?? [0, 0, 0]));
  return index;
}

export function appendGeometry(target: GeometryData, src: GeometryData): void {
  const offset = target.positions.length / 3;
  target.positions.push(...src.positions);
  target.normals.push(...src.normals);
  target.uvs.push(...src.uvs);
  target.colors.push(...src.colors);
  target.extra.push(...src.extra);
  for (const i of src.indices) target.indices.push(i + offset);
}

export function toBufferGeometry(g: GeometryData, extraName = 'facade'): BufferGeometry {
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(g.positions), 3));
  geo.setAttribute('normal', new BufferAttribute(new Float32Array(g.normals), 3));
  geo.setAttribute('uv', new BufferAttribute(new Float32Array(g.uvs), 2));
  geo.setAttribute('color', new BufferAttribute(new Float32Array(g.colors), 3));
  geo.setAttribute(extraName, new BufferAttribute(new Float32Array(g.extra), 3));
  const vertexCount = g.positions.length / 3;
  geo.setIndex(new BufferAttribute(vertexCount > 65535 ? new Uint32Array(g.indices) : new Uint16Array(g.indices), 1));
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

export function triangleArea(g: GeometryData): number {
  let area = 0;
  for (let i = 0; i < g.indices.length; i += 3) {
    const [a, b, c] = [g.indices[i]!, g.indices[i + 1]!, g.indices[i + 2]!].map((k) => [
      g.positions[k * 3]!, g.positions[k * 3 + 1]!, g.positions[k * 3 + 2]!,
    ]) as [number[], number[], number[]];
    const u = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
    const v = [c[0]! - a[0]!, c[1]! - a[1]!, c[2]! - a[2]!];
    area += Math.hypot(u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!) / 2;
  }
  return area;
}
