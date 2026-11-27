import { existsSync, readFileSync } from 'node:fs';
import type { Vec2 } from '../../../shared/geo/types';
import type { RoofShape } from '../../../shared/world/buildingRules';
import { buildRoofMesh, type RoofOptions } from '../../../shared/world/roofGeometry';
import type { RoofMaterial, RoofMeshData } from '../../../shared/world/types';

/** Techo observado en la ortofoto (reference/aerial/roofs.json). */
export interface RoofOverride {
  readonly shape: RoofShape;
  readonly material: RoofMaterial;
  readonly color?: string;
  readonly confidence?: string;
}

export function loadRoofOverrides(path = 'reference/aerial/roofs.json'): Map<string, RoofOverride> {
  if (!existsSync(path)) return new Map();
  const file = JSON.parse(readFileSync(path, 'utf8')) as { roofs: Record<string, RoofOverride> };
  return new Map(Object.entries(file.roofs));
}

/** Pendiente/alero por material: tejas ~30°, chapa ~12° (galpones y aulas del campus). */
export function roofOptions(material: RoofMaterial, shape: RoofShape): RoofOptions {
  if (material === 'tiles') return { pitchDeg: 30, maxHeight: 4.5, eave: 0.55 };
  if (shape === 'pyramidal' || shape === 'dome') return { pitchDeg: 22, maxHeight: 5, eave: 0.4 };
  if (shape === 'round') return { pitchDeg: 15, maxHeight: 4.5, eave: 0.35 };
  return { pitchDeg: 12, maxHeight: 3.5, eave: 0.4 };
}

const flat = (pts: readonly (readonly number[])[]): number[] => pts.flatMap((p) => [...p]);

/** Malla del techo para world.json (null si es plano o el skeleton falla). */
export function roofMeshData(footprint: readonly Vec2[], shape: RoofShape, material: RoofMaterial): { mesh: RoofMeshData; height: number } | null {
  const r = buildRoofMesh(footprint, shape, roofOptions(material, shape));
  if (!r) return null;
  return {
    height: r.height,
    mesh: { faces: r.faces.map(flat), gables: r.gables.map(flat), trim: r.trim.flatMap(([a, b]) => [...a, ...b]) },
  };
}
