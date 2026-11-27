/**
 * Pabellón de Música OGDEN (way/388510375). Referencias: reference/web/way-388510375/01.jpg (2025),
 * 02.jpg (2018). Edificio histórico de 2 pisos, revoque crema con molduras rosa viejo, techo a cuatro
 * aguas de tejas de poca pendiente con alero, parapeto escalonado "C.A.P. 1898" sobre el frente,
 * bow-window en el primer piso sobre el cartel "PABELLON DE MUSICA OGDEN", y galería en planta baja
 * con columnas redondas bajo un faldón de tejas. Frente = cara SE (aristas 4→6, colineales).
 */
import { Matrix4, Vector2 } from 'three';
import type { BuildingData } from '@shared/world/types';
import type { Vec2 } from '@shared/geo/types';
import { HeroBuilder } from '../lib/builder';
import { add, edgeFrame, insetPolygon, len, relativeTo, scale, sub } from '../lib/frame';
import { BASE_MATERIALS, type MaterialSpec } from '../lib/materials';
import { glazing } from '../lib/openings';
import { type Opening, box, cylinder, footprintPrism, loft, profilePrism, ringPrism } from '../lib/parts';
import { textGeometry } from '../lib/text';
import { windowRows } from '../lib/walls';
import type { HeroModel } from './types';

export const OGDEN_MATERIALS = {
  ...BASE_MATERIALS,
  cream: { color: '#efe4cc', roughness: 0.9, texture: 'plaster', uvScale: 3 },
  trimPink: { color: '#b88f82', roughness: 0.85, texture: 'plaster', uvScale: 3 },
  tiles: { color: '#b85a32', roughness: 0.75, texture: 'tiles', uvScale: 2.5 },
  frameWhite: { color: '#f1f1ee', roughness: 0.4 },
  doorWhite: { color: '#e9e9e6', roughness: 0.5 },
  letters: { color: '#7d7468', roughness: 0.6 },
  flagstone: { color: '#b9b1a5', roughness: 0.9, texture: 'stone', uvScale: 2 },
} as const satisfies Record<string, MaterialSpec>;
type M = keyof typeof OGDEN_MATERIALS;

const FLOOR = 3.3;
const EAVE = 6.6;
/** Galería: desde x = LOGGIA_X sobre el frente hasta la esquina NE, con LOGGIA_D de profundidad. */
const LOGGIA_X = 6.6;
const LOGGIA_D = 2.6;

function win(b: HeroBuilder<M>, o: Opening, cols = 2, rows = 2): void {
  const transoms = Array.from({ length: rows - 1 }, (_, k) => o.y + (o.h * (k + 1)) / rows);
  const g = glazing(o, { z: 0.06, frame: 0.08, cols, transoms, bar: 0.05 });
  b.add('glassDark', ...g.glass).add('frameWhite', ...g.frame);
  b.add('trimPink', box(o.w + 0.25, 0.08, 0.2, o.x, o.y - 0.12, 0.08));
}

/** Parapeto escalonado con relieve "C.A.P. 1898" (perfil simétrico). */
async function parapet(b: HeroBuilder<M>, x: number): Promise<void> {
  const steps: [number, number][] = [[5.2, 7.25], [3.6, 7.75], [1.9, 8.3]];
  const profile: Vector2[] = [new Vector2(-5.2, EAVE - 0.3), new Vector2(5.2, EAVE - 0.3)];
  for (let i = 0; i < steps.length; i++) {
    const [hw, h] = steps[i]!;
    const next = steps[i + 1]?.[0];
    profile.push(new Vector2(hw, h));
    if (next !== undefined) profile.push(new Vector2(next, h));
  }
  for (let i = steps.length - 1; i >= 0; i--) {
    const [hw, h] = steps[i]!;
    const next = steps[i + 1]?.[0];
    if (next !== undefined) profile.push(new Vector2(-next, h));
    profile.push(new Vector2(-hw, h));
  }
  const p = profilePrism(profile, 0.35);
  p.translate(x, 0, -0.35);
  b.add('cream', p);
  // Pilaretes en los escalones extremos y líneas en relieve.
  for (const s of [-1, 1]) {
    b.add('cream', box(0.35, 0.35, 0.4, x + s * 3.75, 7.75, -0.2), box(0.35, 0.3, 0.4, x + s * 5.05, 7.25, -0.2));
    b.add('cream', box(1.6, 0.06, 0.05, x + s * 2.9, 7.25, 0.02));
  }
  const cap = await textGeometry('C.A.P.', { height: 0.55, depth: 0.05, font: 'DejaVu Serif', weight: 'normal' });
  cap.translate(x, 7.35, 0);
  const year = await textGeometry('1898', { height: 0.28, depth: 0.04, font: 'DejaVu Serif', weight: 'normal' });
  year.translate(x, 6.95, 0);
  b.add('letters', cap, year);
}

async function bowWindow(b: HeroBuilder<M>, x: number): Promise<void> {
  const w = 4.6, d = 0.75, front = 3.4;
  // Base/cartel con molduras.
  b.add('cream', box(w + 0.2, 0.95, d + 0.1, x, FLOOR - 0.35, d / 2));
  b.add('trimPink', box(w + 0.35, 0.12, d + 0.25, x, FLOOR - 0.45, d / 2 + 0.05), box(w + 0.35, 0.12, d + 0.25, x, FLOOR + 0.55, d / 2 + 0.05));
  for (const s of [-1, 1]) b.add('trimPink', box(0.16, 0.95, 0.12, x + s * (w / 2 + 0.05), FLOOR - 0.35, d + 0.08));
  const t1 = await textGeometry('PABELLON DE MUSICA', { height: 0.2, depth: 0.03, font: 'DejaVu Serif', weight: 'bold' });
  t1.translate(x, FLOOR + 0.22, d + 0.06);
  const t2 = await textGeometry('OGDEN', { height: 0.34, depth: 0.04, font: 'DejaVu Serif', weight: 'bold' });
  t2.translate(x, FLOOR - 0.22, d + 0.06);
  b.add('letters', t1, t2);
  // Paños vidriados: frente y dos laterales a 45°.
  const y = FLOOR + 0.67, h = 2.0;
  const fr = glazing({ x: 0, y, w: front, h }, { z: 0, frame: 0.08, cols: 4, transoms: [y + 1.45], bar: 0.06 });
  const fb = b.transform(new Matrix4().makeTranslation(x, 0, d));
  fb.add('glassDark', ...fr.glass).add('frameWhite', ...fr.frame);
  const side = Math.hypot((w - front) / 2, d);
  for (const s of [-1, 1]) {
    const g = glazing({ x: 0, y, w: side, h }, { z: 0, frame: 0.08, transoms: [y + 1.45], bar: 0.06 });
    const m = new Matrix4().makeTranslation(x + s * (front / 2 + (w - front) / 4), 0, d / 2).multiply(new Matrix4().makeRotationY(s * Math.atan2(d, (w - front) / 2)));
    b.transform(m).add('glassDark', ...g.glass).add('frameWhite', ...g.frame);
  }
  b.add('trimPink', box(w + 0.35, 0.22, d + 0.3, x, y + h, d / 2 + 0.05));
}

/** Faldón de tejas a la altura del entrepiso (alero de la galería) entre x0 y x1 del frente. */
function skirtRoof(b: HeroBuilder<M>, x0: number, x1: number): void {
  const slope = 0.42;
  const depth = 1.05;
  const w = x1 - x0;
  const m = new Matrix4().makeTranslation((x0 + x1) / 2, FLOOR + 0.18, depth / 2 - 0.15).multiply(new Matrix4().makeRotationX(slope));
  b.transform(m).add('tiles', box(w, 0.07, depth, 0, -0.035, 0));
  b.add('trimPink', box(w, 0.22, 0.08, (x0 + x1) / 2, FLOOR - 0.15, depth - 0.2));
}

export async function buildOgden(bd: BuildingData): Promise<HeroModel<M>> {
  const b = new HeroBuilder<M>();
  const fp = relativeTo(bd.footprint, bd.centroid);
  const [p0, p1, p2, p3, p4, , p6, p7, p8] = fp as [Vec2, Vec2, Vec2, Vec2, Vec2, Vec2, Vec2, Vec2, Vec2];
  const front = edgeFrame(p4, p6);
  const L = len(sub(p6, p4));
  const inward = scale(front.normal, -LOGGIA_D);
  const A = add(p4, scale(front.tangent, LOGGIA_X));
  const ground = [p0, p1, p2, p3, p4, A, add(A, inward), add(p6, inward), p7, p8];
  // Planta baja (con la galería recortada), entrepiso y primer piso.
  b.add('cream', ringPrism(ground, insetPolygon(ground, 0.3, true), -4, FLOOR));
  b.add('cream', footprintPrism(fp, FLOOR - 0.15, FLOOR + 0.05));
  b.add('cream', ringPrism(fp, insetPolygon(fp, 0.3, true), FLOOR, EAVE));
  b.add('trimPink', ringPrism(insetPolygon(fp, -0.06, true), insetPolygon(fp, 0.1, true), FLOOR - 0.12, FLOOR + 0.02));
  // Techo a cuatro aguas bajo: alero de 0.6 m, faldones hasta 1.3 m hacia adentro y tapa.
  const roofPoly = [p0, p1, p2, p3, p4, p6, p7];
  const outer = insetPolygon(roofPoly, -0.6, true);
  const inner = insetPolygon(roofPoly, 1.3, true);
  b.add('tiles', loft(outer, inner, EAVE + 0.05, EAVE + 0.75));
  b.add('tiles', footprintPrism(inner, EAVE + 0.6, EAVE + 0.75));
  b.add('trimPink', ringPrism(outer, insetPolygon(roofPoly, -0.5, true), EAVE - 0.15, EAVE + 0.05));
  b.add('cream', footprintPrism(insetPolygon(roofPoly, -0.5, true), EAVE - 0.1, EAVE));
  // Piso de laja de la galería.
  const lf = b.at(front);
  lf.add('flagstone', box(L - LOGGIA_X, 0.06, LOGGIA_D + 1.2, LOGGIA_X + (L - LOGGIA_X) / 2, 0, -LOGGIA_D / 2 + 0.6));
  for (const x of [LOGGIA_X + 0.35, LOGGIA_X + 5.6, L - 0.35]) lf.add('trimPink', cylinder(0.22, 0.24, FLOOR - 0.15, x, 0, -0.35, 18));
  const bayX = 4.4;
  skirtRoof(lf, -0.3, bayX - 2.5);
  skirtRoof(lf, bayX + 2.5, L + 0.3);
  await parapet(lf, 7.6);
  await bowWindow(lf, bayX);
  // Ventanas del frente (primer piso a la derecha e izquierda; planta baja izquierda + puerta).
  win(lf, { x: 11.2, y: FLOOR + 0.95, w: 2.3, h: 1.45 }, 2, 2);
  win(lf, { x: 1.2, y: FLOOR + 1.0, w: 1.1, h: 1.25 }, 2, 2);
  win(lf, { x: 1.5, y: 0.95, w: 1.35, h: 1.35 }, 2, 2);
  lf.add('doorWhite', box(0.95, 2.15, 0.08, 3.9, 0, 0.04));
  // Fondo de la galería: puerta doble con banderola y ventanas.
  const back = b.at(edgeFrame(add(A, inward), add(p6, inward)));
  back.add('doorWhite', box(1.2, 2.3, 0.08, 5.2, 0, 0.04));
  win(back, { x: 5.2, y: 2.4, w: 1.2, h: 0.4 }, 3, 1);
  win(back, { x: 2.0, y: 0.95, w: 1.0, h: 1.0 }, 2, 2);
  win(back, { x: 8.2, y: 0.9, w: 2.4, h: 1.3 }, 2, 2);
  // Laterales y fondo: ventanas regulares en ambos pisos.
  windowRows(b, fp, {
    glass: 'glassDark', frame: 'frameWhite', sill: 'trimPink', rows: [0.95, FLOOR + 0.95], width: 1.15, height: 1.45, spacing: 3.2, margin: 1.4,
  }, new Set([4, 5]));
  return { builder: b, materials: OGDEN_MATERIALS };
}
