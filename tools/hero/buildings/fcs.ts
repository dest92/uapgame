/**
 * Facultad de Ciencias de la Salud (way/388495176). Referencias: reference/web/way-388495176/01.jpg y
 * 02.jpg (2026, acceso). Alas de 2 niveles: ladrillo visto abajo, banda de revoque crema y parapeto de
 * ladrillo con hilada saliente. Acceso en el vértice entrante del lado sur (vértices 10-11-12, donde está
 * el POI de la Facultad): bloque de revoque blanco con logo y letras, hall vidriado de doble altura con
 * losas gris verdoso, explanada de granito y bancos de hormigón. Letras "EDIFICIO THOMAS TOOMA &
 * MARTA KALBERMATTER" sobre la banda crema del ala derecha.
 * La orientación del acceso es una estimación (no hay foto aérea permitida): ver refs.json.
 */
import type { BuildingData } from '@shared/world/types';
import type { Vec2 } from '@shared/geo/types';
import { HeroBuilder } from '../lib/builder';
import { type Frame2, edgeFrame, insetPolygon, len, norm, relativeTo, sub } from '../lib/frame';
import { BASE_MATERIALS, type MaterialSpec } from '../lib/materials';
import { glazing } from '../lib/openings';
import { box, footprintPrism, ringPrism } from '../lib/parts';
import { svgGeometry, textGeometry } from '../lib/text';
import { windowRows } from '../lib/walls';
import type { HeroModel } from './types';

export const FCS_MATERIALS = {
  ...BASE_MATERIALS,
  brick: { color: '#87503c', roughness: 0.9, texture: 'brick', uvScale: 1.0 },
  creamBand: { color: '#ece4cc', roughness: 0.9, texture: 'plaster', uvScale: 3 },
  whiteBlock: { color: '#f1efe8', roughness: 0.9, texture: 'plaster', uvScale: 3 },
  slabGreen: { color: '#7d8677', roughness: 0.7 },
  frameWhite: { color: '#efefec', roughness: 0.4 },
  letters: { color: '#2a2c2e', roughness: 0.4, metalness: 0.6 },
  granite: { color: '#8a6a5c', roughness: 0.85, texture: 'concrete', uvScale: 1.2 },
  benchConcrete: { color: '#c9c6a8', roughness: 0.85, texture: 'concrete', uvScale: 1 },
} as const satisfies Record<string, MaterialSpec>;
type M = keyof typeof FCS_MATERIALS;

/** Vértice entrante del acceso y sus vecinos en el footprint. */
const NOTCH = [10, 11, 12] as const;
const H = { brick: 3.4, band: 6.0, top: 6.9 } as const;

const IASD_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="360">
<path d="M30 300 L200 270 L370 300 L370 325 L200 300 L30 325 Z" fill="#fff"/>
<path d="M200 262 C130 210 215 150 175 40 C250 120 175 190 230 250 Z" fill="#fff"/>
<path d="M150 262 C105 225 150 185 132 130 C175 175 140 215 185 255 Z" fill="#fff"/>
<path d="M248 262 C290 228 252 190 272 150 C230 185 262 220 218 258 Z" fill="#fff"/>
</svg>`;

/** Marco del acceso: en el vértice entrante, mirando según la bisectriz de las normales de las dos aristas. */
function notchFrame(a: Vec2, apex: Vec2, c: Vec2): Frame2 {
  const n1 = edgeFrame(a, apex).normal;
  const n2 = edgeFrame(apex, c).normal;
  const normal = norm({ x: n1.x + n2.x, z: n1.z + n2.z });
  return { origin: apex, normal, tangent: { x: normal.z, z: -normal.x } };
}

async function entrance(b: HeroBuilder<M>): Promise<void> {
  const z0 = 5.6;
  // Bloque blanco (izquierda) con franja vidriada lateral.
  b.add('whiteBlock', box(6.2, 8.3, 9, -3.3, -0.2, z0 - 4.5));
  b.add('slabGreen', box(1.5, 0.3, 1.2, -6.9, 7.2, z0 - 0.3));
  const strip = glazing({ x: -6.75, y: 0.05, w: 0.95, h: 7.1 }, { z: z0 - 0.2, frame: 0.06, transoms: [2.4, 4.8], bar: 0.05 });
  b.add('glassDark', ...strip.glass).add('aluminium', ...strip.frame);
  b.add('whiteBlock', box(1.0, 7.2, 8, -6.75, -0.2, z0 - 4.6));
  const logo = await svgGeometry(IASD_LOGO, 1.0, 0.05);
  logo.translate(-3.3, 6.55, z0);
  const uap = await textGeometry('UNIVERSIDAD\nADVENTISTA\nDEL PLATA', { height: 0.95, depth: 0.05, font: 'DejaVu Serif', lineHeight: 1.0 });
  uap.translate(-3.3, 5.5, z0);
  const fcs = await textGeometry('Facultad de\nCiencias de la Salud', { height: 0.6, depth: 0.04, font: 'DejaVu Sans', weight: 'bold' });
  fcs.translate(-3.6, 4.5, z0);
  b.add('letters', logo, uap, fcs);
  // Hall vidriado de doble altura con losa intermedia y alero gris verdoso.
  const hallW = 7.4, hx = 3.7;
  b.add('glassDark', box(hallW, 6.4, 8, hx, 0, z0 - 4.6));
  for (const [y0, h] of [[0.05, 3.1], [3.45, 2.95]] as const) {
    const g = glazing({ x: hx, y: y0, w: hallW - 0.2, h }, { z: z0 - 0.4, frame: 0.07, cols: 2, bar: 0.06 });
    b.add('glassBlue', ...g.glass).add('aluminium', ...g.frame);
  }
  const door = glazing({ x: 1.6, y: 0.05, w: 1.9, h: 2.5 }, { z: z0 - 0.35, frame: 0.08, cols: 2 });
  b.add('aluminium', ...door.frame);
  b.add('slabGreen', box(hallW + 0.4, 0.3, 1.2, hx, 3.15, z0 - 0.3), box(hallW + 0.6, 0.35, 1.4, hx, 6.4, z0 - 0.3));
  // Explanada de granito y bancos de hormigón en "S".
  b.add('granite', box(16, 0.05, 11, 0.5, -0.02, z0 + 5));
  for (const x of [-6.5, 6.8]) {
    b.add('benchConcrete', box(0.5, 0.45, 2.4, x, 0, z0 + 3.5), box(0.5, 0.8, 0.5, x, 0, z0 + 2.3), box(0.5, 0.8, 0.5, x, 0, z0 + 4.7));
  }
}

export async function buildFcs(bd: BuildingData): Promise<HeroModel<M>> {
  const b = new HeroBuilder<M>();
  const fp = relativeTo(bd.footprint, bd.centroid);
  const inner = insetPolygon(fp, 0.35, true);
  b.add('brick', ringPrism(fp, inner, -4, H.brick));
  b.add('creamBand', ringPrism(fp, inner, H.brick, H.band));
  b.add('brick', ringPrism(fp, inner, H.band, H.top));
  // Hilada saliente de ladrillo bajo la banda y bajo el parapeto.
  for (const y of [H.brick - 0.12, H.band]) b.add('brick', ringPrism(insetPolygon(fp, -0.06, true), insetPolygon(fp, 0.1, true), y, y + 0.12));
  b.add('roofMembrane', footprintPrism(inner, H.top - 0.9, H.top - 0.8));
  b.add('concreteWhite', ringPrism(insetPolygon(fp, -0.03, true), insetPolygon(fp, 0.38, true), H.top, H.top + 0.06));
  const [a, apex, c] = NOTCH.map((i) => fp[i]!) as [Vec2, Vec2, Vec2];
  const nf = notchFrame(a, apex, c);
  const near = (edge: number, x: number): boolean => {
    // Sin ventanas en las aristas del acceso cerca del vértice (las ocupa el bloque de entrada).
    if (edge === NOTCH[0]) return x > 10.87 - 8;
    if (edge === NOTCH[1]) return x < 8;
    return false;
  };
  windowRows(b, fp, { glass: 'glassDark', frame: 'frameWhite', rows: [0.15], width: 1.8, height: 2.6, spacing: 4.6, margin: 2, skipAt: near });
  windowRows(b, fp, { glass: 'glassDark', frame: 'aluminium', rows: [4.1], width: 1.6, height: 1.2, spacing: 4.6, margin: 2, skipAt: near });
  await entrance(b.at(nf));
  // Letras sobre la banda crema del ala derecha del acceso.
  const tooma = await textGeometry('EDIFICIO THOMAS TOOMA & MARTA KALBERMATTER', { height: 0.36, depth: 0.05, font: 'DejaVu Sans', weight: 'bold' });
  const right = edgeFrame(apex, c);
  tooma.translate(len(sub(c, apex)) / 2 + 5.2, 4.5, 0.02);
  b.at(right).add('letters', tooma);
  return { builder: b, materials: FCS_MATERIALS };
}
