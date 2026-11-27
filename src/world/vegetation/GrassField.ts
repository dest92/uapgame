import { DataTexture, HalfFloatType, InstancedMesh, LinearFilter, Matrix4, RedFormat, DataUtils, type Texture } from 'three/webgpu';
import { InstancedBufferAttribute } from 'three/webgpu';
import type { HeightGrid } from '@shared/terrain/heightField';
import { mulberry32 } from '../../domain/vegetation/scatter';
import { emptyGeometry, pushVertex, toBufferGeometry } from '../geometry/GeometryData';
import type { VegetationMaterials } from './VegetationMaterials';

/** Mata de 3 hojas con 3 segmentos (para curvarse con el viento). uv.y = 0 base → 1 punta. */
function clumpGeometry() {
  const g = emptyGeometry();
  for (let b = 0; b < 3; b++) {
    const a = (b / 3) * Math.PI + 0.3;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const lean = 0.08 * (b - 1);
    const base = g.positions.length / 3;
    for (let s = 0; s <= 3; s++) {
      const t = s / 3;
      const w = 0.028 * (1 - t * 0.9);
      for (const side of [-1, 1]) {
        pushVertex(g, { p: [dx * w * side + lean * t, t, dz * w * side + lean * t * 0.5], n: [0, 1, 0], uv: [(side + 1) / 2, t], color: [1, 1, 1] });
      }
    }
    for (let s = 0; s < 3; s++) {
      const k = base + s * 2;
      g.indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  return toBufferGeometry(g);
}

/** Textura de alturas (half float) para muestrear el terreno en el vertex shader del pasto. */
export function heightTexture(grid: HeightGrid): Texture {
  const data = new Uint16Array(grid.cols * grid.rows);
  grid.heights.forEach((h, i) => (data[i] = DataUtils.toHalfFloat(h)));
  const t = new DataTexture(data, grid.cols, grid.rows, RedFormat, HalfFloatType);
  t.minFilter = t.magFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

/**
 * Pasto instanciado alrededor de la cámara (VEG-4): un único draw call; las
 * matas se "envuelven" en un toroide de radio R que sigue a la cámara, con
 * altura y densidad tomadas del terreno y del splat map en el shader.
 */
export function createGrassField(mats: VegetationMaterials, params: Parameters<VegetationMaterials['grass']>[0], density: number): InstancedMesh {
  const area = (params.radius * 2) ** 2;
  const count = Math.min(120_000, Math.floor(area * density));
  const rand = mulberry32(99);
  const offsets = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    offsets.set([(rand() * 2 - 1) * params.radius, (rand() * 2 - 1) * params.radius, rand(), rand()], i * 4);
  }
  const geo = clumpGeometry();
  geo.setAttribute('grassOffset', new InstancedBufferAttribute(offsets, 4));
  const mesh = new InstancedMesh(geo, mats.grass(params), count);
  const identity = new Matrix4();
  for (let i = 0; i < count; i++) mesh.setMatrixAt(i, identity);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  mesh.name = 'grass';
  return mesh;
}
