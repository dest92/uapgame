/**
 * Edificio de ladrillo de 2 pisos junto al Pórtico (relation/16816367, "Ex CAP", sin nombre en OSM).
 * Referencias: reference/web/way-388521996/01–03.jpg. Ladrillo visto, techo plano con parapeto,
 * ventanas con celosías horizontales de aluminio claro y, desde la remodelación de 2026, las letras
 * "UNIVERSIDAD ADVENTISTA DEL PLATA" en lo alto de la fachada que mira a la plaza de acceso.
 */
import type { BuildingData } from '@shared/world/types';
import { HeroBuilder } from '../lib/builder';
import { edgeFrame, relativeTo } from '../lib/frame';
import { BASE_MATERIALS, type MaterialSpec } from '../lib/materials';
import { textGeometry } from '../lib/text';
import { flatRoofMass, windowRows } from '../lib/walls';
import type { HeroModel } from './types';

export const CAP_MATERIALS = {
  ...BASE_MATERIALS,
  brick: { color: '#84462f', roughness: 0.9, texture: 'brick', uvScale: 1.6 },
  letters: { color: '#5b5d5e', roughness: 0.45, metalness: 0.6 },
} as const satisfies Record<string, MaterialSpec>;
type M = keyof typeof CAP_MATERIALS;

/** Arista del footprint que mira a la plaza del Pórtico (vértices 6 → 7). */
const PLAZA_EDGE = 6;
const HEIGHT = 7.0;

export async function buildEdificioCap(bd: BuildingData): Promise<HeroModel<M>> {
  const b = new HeroBuilder<M>();
  const fp = relativeTo(bd.footprint, bd.centroid);
  flatRoofMass(b, fp, { wall: 'brick', roof: 'roofMembrane', coping: 'concreteWhite', height: HEIGHT, parapet: 0.7 });
  windowRows(b, fp, {
    glass: 'glassDark', frame: 'aluminium', sill: 'concreteWhite', louverMat: 'aluminium',
    rows: [1.0, 4.4], width: 2.1, height: 1.45, spacing: 3.9, margin: 2.2, louvers: 9,
  });
  const letters = await textGeometry('UNIVERSIDAD ADVENTISTA DEL PLATA', { height: 0.8, depth: 0.06, font: 'DejaVu Serif', weight: 'bold' });
  letters.translate(11.5, HEIGHT - 0.95, 0.02);
  b.at(edgeFrame(fp[PLAZA_EDGE]!, fp[(PLAZA_EDGE + 1) % fp.length]!)).add('letters', letters);
  return { builder: b, materials: CAP_MATERIALS };
}
