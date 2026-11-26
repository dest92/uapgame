import { BufferAttribute, BufferGeometry } from 'three/webgpu';
import type { BBox2 } from '@shared/geo/types';
import type { HeightSampler } from '@shared/terrain/heightField';

/**
 * Grilla de terreno que cubre `bounds` más un anillo exterior (`skirt`) que cae
 * suavemente hacia el horizonte para que el borde del mundo no se vea.
 * UV: 0..1 sobre `bounds` (para la textura de suelo pintada).
 */
export function buildTerrainGeometry(bounds: BBox2, terrain: HeightSampler, cell: number, skirt: number): BufferGeometry {
  const minX = bounds.minX - skirt;
  const minZ = bounds.minZ - skirt;
  const w = bounds.maxX - bounds.minX + skirt * 2;
  const d = bounds.maxZ - bounds.minZ + skirt * 2;
  const cols = Math.ceil(w / cell) + 1;
  const rows = Math.ceil(d / cell) + 1;
  const pos = new Float32Array(cols * rows * 3);
  const uv = new Float32Array(cols * rows * 2);
  const bw = bounds.maxX - bounds.minX;
  const bd = bounds.maxZ - bounds.minZ;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = minX + (c / (cols - 1)) * w;
      const z = minZ + (r / (rows - 1)) * d;
      const cx = Math.min(bounds.maxX, Math.max(bounds.minX, x));
      const cz = Math.min(bounds.maxZ, Math.max(bounds.minZ, z));
      const outside = Math.hypot(x - cx, z - cz);
      const y = terrain.heightAt(cx, cz) - Math.min(outside * 0.02, 6);
      const i = r * cols + c;
      pos.set([x, y, z], i * 3);
      uv.set([(x - bounds.minX) / bw, (z - bounds.minZ) / bd], i * 2);
    }
  }
  const idx = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let k = 0;
  for (let r = 0; r < rows - 1; r++)
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      idx.set([a, a + cols, a + 1, a + 1, a + cols, a + cols + 1], k);
      k += 6;
    }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('uv', new BufferAttribute(uv, 2));
  geo.setIndex(new BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  return geo;
}
