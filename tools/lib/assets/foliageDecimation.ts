/**
 * Decimación de follaje escaneado: las hojas son islas de geometría disjuntas, así
 * que en vez de simplificar (que las borraría) se conserva una fracción determinista
 * de islas y se agranda cada una para preservar la densidad visual de la copa.
 */
export interface MeshArrays {
  positions: Float32Array;
  indices: Uint32Array;
}

/** Componentes conexos por triángulo (union-find sobre vértices). */
export function triangleComponents(indices: Uint32Array, vertexCount: number): Int32Array {
  const parent = new Int32Array(vertexCount).map((_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  };
  for (let t = 0; t < indices.length; t += 3) {
    const a = find(indices[t]!);
    for (const v of [indices[t + 1]!, indices[t + 2]!]) {
      const b = find(v);
      if (a !== b) parent[b] = a;
    }
  }
  const comp = new Int32Array(indices.length / 3);
  for (let t = 0; t < comp.length; t++) comp[t] = find(indices[t * 3]!);
  return comp;
}

const keepHash = (id: number): number => {
  const h = Math.sin(id * 12.9898) * 43758.5453;
  return h - Math.floor(h);
};

/**
 * Conserva `fraction` de las islas (hojas/racimos) y las escala ×`grow` sobre su centro.
 * Devuelve nuevos índices; las posiciones se modifican en una copia.
 */
export function thinFoliage(mesh: MeshArrays, fraction: number, grow: number): MeshArrays {
  const vertexCount = mesh.positions.length / 3;
  const comp = triangleComponents(mesh.indices, vertexCount);
  const keepTri: number[] = [];
  const centers = new Map<number, [number, number, number, number]>();
  for (let t = 0; t < comp.length; t++) {
    if (keepHash(comp[t]!) >= fraction) continue;
    keepTri.push(t);
    const c = centers.get(comp[t]!) ?? [0, 0, 0, 0];
    for (let k = 0; k < 3; k++) {
      const v = mesh.indices[t * 3 + k]!;
      c[0] += mesh.positions[v * 3]!;
      c[1] += mesh.positions[v * 3 + 1]!;
      c[2] += mesh.positions[v * 3 + 2]!;
      c[3]++;
    }
    centers.set(comp[t]!, c);
  }
  const positions = new Float32Array(mesh.positions);
  const moved = new Uint8Array(vertexCount);
  const indices = new Uint32Array(keepTri.length * 3);
  keepTri.forEach((t, i) => {
    const c = centers.get(comp[t]!)!;
    for (let k = 0; k < 3; k++) {
      const v = mesh.indices[t * 3 + k]!;
      indices[i * 3 + k] = v;
      if (moved[v]) continue;
      moved[v] = 1;
      for (let a = 0; a < 3; a++) {
        const center = c[a]! / c[3]!;
        positions[v * 3 + a] = center + (positions[v * 3 + a]! - center) * grow;
      }
    }
  });
  return { positions, indices };
}
