import type { EnuProjection } from '../../../shared/geo/enu';
import type { BBox2 } from '../../../shared/geo/types';
import { gaussianSmooth } from '../../../shared/terrain/heightField';
import type { TerrainData } from '../../../shared/world/types';

export interface ResampleInput {
  readonly bounds: BBox2;
  readonly cellSize: number;
  readonly proj: EnuProjection;
  readonly sampleGeo: (lon: number, lat: number) => number;
  /** Suavizado gaussiano en celdas (0 = sin suavizar). */
  readonly sigmaCells: number;
  readonly source: string;
}

/**
 * Remuestrea una fuente de elevación geográfica a una grilla local en metros,
 * suaviza y normaliza para que el origen del mundo quede a altura 0.
 */
export function resampleTerrain(input: ResampleInput): TerrainData {
  const { bounds, cellSize, proj } = input;
  const cols = Math.round((bounds.maxX - bounds.minX) / cellSize) + 1;
  const rows = Math.round((bounds.maxZ - bounds.minZ) / cellSize) + 1;
  const raw: number[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const g = proj.toGeo({ x: bounds.minX + c * cellSize, z: bounds.minZ + r * cellSize });
      raw.push(input.sampleGeo(g.lon, g.lat));
    }
  const smooth = input.sigmaCells > 0 ? gaussianSmooth(raw, cols, rows, input.sigmaCells) : raw;
  const o = proj.origin;
  const base = input.sampleGeo(o.lon, o.lat);
  return {
    kind: 'heightmap',
    source: input.source,
    grid: {
      originX: bounds.minX, originZ: bounds.minZ, cellSize, cols, rows,
      heights: smooth.map((h) => Math.round((h - base) * 100) / 100),
    },
  };
}
