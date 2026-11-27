/**
 * Auditorio Mayor (way/388500965). Sin fotos de fachada: volumen deducido de la ortofoto IGN 2013
 * (reference/aerial/, 0.25 m/px) y del dato institucional "auditorio multiuso de 82 × 35 m (1974)".
 * La ortofoto muestra una cubierta en bóveda de cañón de chapa clara sobre el eje largo, con dos hileras de
 * lucernarios. Muros, aberturas y acceso son ESTIMADOS (no relevados): revoque claro con zócalo de
 * ladrillo, ventanas altas corridas en los laterales y acceso con marquesina en el testero NO.
 */
import { Vector2 } from 'three';
import type { BuildingData } from '@shared/world/types';
import { HeroBuilder } from '../lib/builder';
import { edgeFrame, insetPolygon, len, relativeTo, sub } from '../lib/frame';
import { BASE_MATERIALS, type MaterialSpec } from '../lib/materials';
import { glazing } from '../lib/openings';
import { arcPoints, box, flatShape, profilePrism, ringPrism } from '../lib/parts';
import { windowRows } from '../lib/walls';
import type { HeroModel } from './types';

export const AUDITORIO_MATERIALS = {
  ...BASE_MATERIALS,
  wall: { color: '#e7e1d3', roughness: 0.9, texture: 'plaster', uvScale: 3 },
  brick: { color: '#8a4d38', roughness: 0.9, texture: 'brick', uvScale: 1.0 },
  sheet: { color: '#c9cdcf', roughness: 0.42, metalness: 0.65 },
  skylight: { color: '#dfe6ea', roughness: 0.2, metalness: 0.1 },
} as const satisfies Record<string, MaterialSpec>;
type M = keyof typeof AUDITORIO_MATERIALS;

const WALL_H = 6.0;
const VAULT_RISE = 6.5;
/** Arista del testero NO (vértices 0 → 1) donde se ubica el acceso estimado. */
const END_EDGE = 0;

export async function buildAuditorio(bd: BuildingData): Promise<HeroModel<M>> {
  const b = new HeroBuilder<M>();
  const fp = relativeTo(bd.footprint, bd.centroid);
  const a = fp[END_EDGE]!, c = fp[END_EDGE + 1]!;
  const W = len(sub(c, a));
  const Ld = len(sub(fp[2]!, fp[1]!));
  const inner = insetPolygon(fp, 0.35, true);
  b.add('brick', ringPrism(fp, inner, -4, 1.0));
  b.add('wall', ringPrism(fp, inner, 1.0, WALL_H));
  b.add('concreteWhite', ringPrism(insetPolygon(fp, -0.08, true), insetPolygon(fp, 0.12, true), WALL_H - 0.3, WALL_H));
  windowRows(b, fp, { glass: 'glassDark', frame: 'aluminium', sill: 'concreteWhite', rows: [3.6], width: 3.0, height: 1.3, spacing: 5.2, margin: 3, minEdge: 50 });
  // Bóveda de cañón sobre el eje largo: segmento de círculo extruido desde el testero.
  const end = b.at(edgeFrame(a, c), 0, W / 2, 0);
  const half = W / 2 + 0.4;
  const R = (half * half + VAULT_RISE * VAULT_RISE) / (2 * VAULT_RISE);
  const a0 = Math.asin(half / R);
  const arc = arcPoints(0, WALL_H + VAULT_RISE - R, R, R, Math.PI / 2 + a0, Math.PI / 2 - a0, 32).reverse();
  const vault = profilePrism([new Vector2(-half, WALL_H - 0.05), ...arc.slice(1, -1), new Vector2(half, WALL_H - 0.05)], Ld + 0.8);
  vault.translate(0, 0, 0.4);
  end.add('sheet', vault);
  // Tímpanos revocados en ambos testeros (por delante de la chapa).
  const tymp = [new Vector2(-W / 2, WALL_H), ...arc.slice(1, -1).map((p) => new Vector2(p.x * (W / 2) / half, p.y - 0.15)), new Vector2(W / 2, WALL_H)];
  end.add('wall', flatShape(tymp, 0.42));
  const back = b.at(edgeFrame(fp[2]!, fp[3]!), 0, W / 2, 0);
  back.add('wall', flatShape(tymp, 0.42));
  // Dos hileras de lucernarios, como en la ortofoto.
  for (const s of [-1, 1]) {
    const x = s * W * 0.2;
    const y = WALL_H + VAULT_RISE - R + Math.sqrt(R * R - x * x);
    for (let k = 0; k < 12; k++) end.add('skylight', box(1.2, 0.35, 1.6, x, y - 0.1, -4 - k * ((Ld - 8) / 11)));
  }
  // Acceso estimado: marquesina y frente vidriado en el testero.
  const door = { x: 0, y: 0, w: 8, h: 2.8 };
  const g = glazing(door, { z: 0.06, cols: 4, transoms: [2.3], frame: 0.08 });
  end.add('glassDark', ...g.glass).add('aluminiumDark', ...g.frame);
  end.add('concreteWhite', box(11, 0.3, 3.2, 0, 3.2, 1.6));
  for (const x of [-5.2, 5.2]) end.add('steelGrey', box(0.25, 3.2, 0.25, x, 0, 3.0));
  end.add('concreteGrey', box(12, 0.12, 4, 0, -0.08, 2));
  return { builder: b, materials: AUDITORIO_MATERIALS };
}
