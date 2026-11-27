/**
 * Edificio de ladrillo de 2 pisos junto al Pórtico (relation/16816367, "Ex CAP", sin nombre en OSM).
 * Referencias: reference/web/way-388521996/01–03.jpg. Ladrillo visto, techo plano con parapeto,
 * ventanas con celosías horizontales de aluminio claro y, desde la remodelación de 2026, las letras
 * "UNIVERSIDAD ADVENTISTA DEL PLATA" en lo alto de la fachada que mira a la plaza de acceso.
 */
import type { BuildingData } from '@shared/world/types';
import { HeroBuilder } from '../lib/builder';
import { edgeFrame, insetPolygon, relativeTo } from '../lib/frame';
import { ringPrism } from '../lib/parts';
import { BASE_MATERIALS, type MaterialSpec } from '../lib/materials';
import { textGeometry } from '../lib/text';
import { flatRoofMass, windowRows } from '../lib/walls';
import type { HeroModel } from './types';

export const CAP_MATERIALS = {
  ...BASE_MATERIALS,
  brick: { color: '#84462f', roughness: 0.9, texture: 'brick', uvScale: 1.0 },
  letters: { color: '#2f3031', roughness: 0.4, metalness: 0.5 },
} as const satisfies Record<string, MaterialSpec>;
type M = keyof typeof CAP_MATERIALS;

/** Arista del footprint que mira a la plaza del Pórtico (vértices 6 → 7). */
const PLAZA_EDGE = 6;
const HEIGHT = 7.0;

export async function buildEdificioCap(bd: BuildingData): Promise<HeroModel<M>> {
  const b = new HeroBuilder<M>();
  const fp = relativeTo(bd.footprint, bd.centroid);
  flatRoofMass(b, fp, { wall: 'brick', roof: 'roofMembrane', coping: 'concreteWhite', height: HEIGHT, parapet: 0.7 });
  // Hiladas salientes (técnica de cornisa por cajas apiladas): entrepiso y bajo el parapeto.
  for (const [y, h, out] of [[3.35, 0.15, 0.05], [HEIGHT - 0.1, 0.12, 0.07], [HEIGHT + 0.02, 0.1, 0.035], [0, 0.45, 0.04]] as const) {
    b.add(y === 0 ? 'concreteGrey' : 'brick', ringPrism(insetPolygon(fp, -out, true), insetPolygon(fp, 0.1, true), y, y + h));
  }
  windowRows(b, fp, {
    glass: 'glassDark', frame: 'aluminium', sill: 'concreteWhite', louverMat: 'aluminium',
    rows: [1.0, 4.4], width: 2.1, height: 1.45, spacing: 3.9, margin: 2.2, louvers: 9,
  });
  const letters = await textGeometry('UNIVERSIDAD ADVENTISTA DEL PLATA', { height: 0.8, depth: 0.09, font: 'DejaVu Serif', weight: 'bold' });
  letters.translate(11.5, HEIGHT - 0.95, 0.02);
  b.at(edgeFrame(fp[PLAZA_EDGE]!, fp[(PLAZA_EDGE + 1) % fp.length]!)).add('letters', letters);
  return { builder: b, materials: CAP_MATERIALS };
}
