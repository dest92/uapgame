/**
 * Biblioteca E. I. Mohr — Edificio Fernando Chaij (way/388495172).
 * Referencias: reference/web/way-388495172/05.jpg (frontal, 2025) y 06.jpg (acceso, 2026); 01/03 para
 * silueta y laterales. Fachada principal = cara SE (arista 2→3), frente a la Fuente UAP.
 * 3 niveles: planta baja retirada en galería (columnas, muros de ladrillo y ventanas oscuras), dos pisos
 * de placas beige claro con juntas, cuerpo central con dos pilastras rosa viejo, muro cortina de 4×4 paños
 * con carpintería negra, dintel con letras "EDIFICIO FERNANDO CHAIJ", frontón a dos aguas y escalinata.
 */
import { Vector2 } from 'three';
import type { BuildingData } from '@shared/world/types';
import type { Vec2 } from '@shared/geo/types';
import { HeroBuilder } from '../lib/builder';
import { edgeFrame, insetPolygon, len, relativeTo, sub } from '../lib/frame';
import { BASE_MATERIALS, type MaterialSpec } from '../lib/materials';
import { glazing } from '../lib/openings';
import { box, cylinder, footprintPrism, profilePrism, ringPrism } from '../lib/parts';
import { textGeometry } from '../lib/text';
import { type Rect2, panelGrid, windowRows } from '../lib/walls';
import type { HeroModel } from './types';

export const BIBLIOTECA_MATERIALS = {
  ...BASE_MATERIALS,
  panelBeige: { color: '#e4dbc6', roughness: 0.6, texture: 'concrete', uvScale: 3 },
  jointBeige: { color: '#a59c88', roughness: 0.8 },
  pinkPlaster: { color: '#b48e8a', roughness: 0.9, texture: 'plaster', uvScale: 3 },
  creamPlaster: { color: '#e6dac0', roughness: 0.9, texture: 'plaster', uvScale: 3 },
  brick: { color: '#8e4a36', roughness: 0.9, texture: 'brick', uvScale: 1.6 },
  mullionBlack: { color: '#1f2123', roughness: 0.4, metalness: 0.6 },
  letters: { color: '#2b2b2b', roughness: 0.35, metalness: 0.7 },
} as const satisfies Record<string, MaterialSpec>;
type M = keyof typeof BIBLIOTECA_MATERIALS;

/** Índice de la arista de la fachada principal (SE). */
export const FRONT_EDGE = 2;
/** Cotas (m) estimadas de 05.jpg con la puerta (~2.4 m) y las personas de 06.jpg como escala. */
export const LEVELS = { floor: 0.45, soffit: 4.0, roof: 11.8, parapet: 12.3, pilaster: 13.4, apex: 15.6 } as const;
const BAY = 7.2;
const PILASTER = 3.1;

function upperMass(b: HeroBuilder<M>, fp: readonly Vec2[]): void {
  const inner = insetPolygon(fp, 0.35, true);
  b.add('jointBeige', ringPrism(fp, inner, LEVELS.soffit, LEVELS.parapet));
  b.add('concreteWhite', footprintPrism(fp, LEVELS.soffit - 0.15, LEVELS.soffit));
  b.add('roofMembrane', footprintPrism(inner, LEVELS.roof - 0.1, LEVELS.roof));
  b.add('pinkPlaster', ringPrism(insetPolygon(fp, -0.05, true), insetPolygon(fp, 0.4, true), LEVELS.parapet, LEVELS.parapet + 0.12));
}

/** Placas y ventanas angostas en cada fachada; en el frente, solo en las alas. */
function claddings(b: HeroBuilder<M>, fp: readonly Vec2[]): void {
  fp.forEach((a, i) => {
    const c = fp[(i + 1) % fp.length]!;
    const L = len(sub(c, a));
    if (L < 4) return;
    const local = b.at(edgeFrame(a, c));
    const y0 = LEVELS.soffit + 0.1, y1 = LEVELS.parapet - 0.15;
    const mid = L / 2;
    const windows: number[] = [];
    const ranges: [number, number][] = [];
    const skip: Rect2[] = [];
    if (i === FRONT_EDGE) {
      // Alas del frente: placas hasta la ventana angosta pegada a cada pilastra.
      const half = BAY / 2 + PILASTER;
      windows.push(mid - half - 0.5, mid + half + 0.5);
      ranges.push([0.05, mid - half - 0.95], [mid + half + 0.95, L - 0.05]);
    } else {
      const n = Math.max(1, Math.floor((L - 4) / 6.3));
      for (let k = 0; k < n; k++) windows.push(L / 2 + (k - (n - 1) / 2) * 6.3);
      for (const x of windows) skip.push({ x0: x - 0.5, x1: x + 0.5, y0: 0, y1: 99 });
      ranges.push([0.05, L - 0.05]);
    }
    for (const [x0, x1] of ranges) panelGrid(local, { panel: 'panelBeige', x0, x1, y0, y1, pw: 2.1, ph: 1.9, skip });
    for (const x of windows) {
      const o = { x, y: LEVELS.soffit + 0.45, w: 0.8, h: LEVELS.roof - LEVELS.soffit - 1.0 };
      const g = glazing(o, { z: 0.03, frame: 0.07, transoms: [o.y + 1.5, o.y + 3.0, o.y + 4.5, o.y + 6.0] });
      local.add('glassDark', ...g.glass).add('mullionBlack', ...g.frame);
    }
  });
}

/** Planta baja: núcleo de ladrillo retirado, ventanas oscuras y columnas sobre la línea de fachada. */
function gallery(b: HeroBuilder<M>, fp: readonly Vec2[], frontMid: number): void {
  const core = insetPolygon(fp, 2.0, true);
  b.add('brick', ringPrism(core, insetPolygon(core, 0.3, true), LEVELS.floor, LEVELS.soffit - 0.15));
  const entrance = BAY / 2 + PILASTER + 0.6;
  windowRows(b, core, {
    glass: 'glassDark', frame: 'mullionBlack', rows: [LEVELS.floor + 0.7], width: 2.6, height: 2.3, spacing: 4.2, margin: 1.4,
    skipAt: (edge, x) => edge === FRONT_EDGE && Math.abs(x - (frontMid - 2.0)) < entrance,
  });
  fp.forEach((a, i) => {
    const c = fp[(i + 1) % fp.length]!;
    const L = len(sub(c, a));
    if (L < 4) return;
    const local = b.at(edgeFrame(a, c));
    const n = Math.round((L - 0.8) / 4.2);
    for (let k = 0; k <= n; k++) {
      const x = 0.4 + (k * (L - 0.8)) / n;
      if (i === FRONT_EDGE && Math.abs(x - frontMid) < BAY / 2 + PILASTER + 0.4) continue;
      local.add('pinkPlaster', box(0.5, LEVELS.soffit - 0.15 - LEVELS.floor, 0.5, x, LEVELS.floor, -0.4));
    }
  });
}

async function centralBody(b: HeroBuilder<M>): Promise<void> {
  const half = BAY / 2;
  for (const s of [-1, 1]) b.add('pinkPlaster', box(PILASTER, LEVELS.pilaster, 3.6, s * (half + PILASTER / 2), 0, -1.2));
  // Muro cortina 4×4 con carpintería negra.
  const cw = { x: 0, y: 4.55, w: BAY, h: 5.6 };
  const g = glazing(cw, { z: 0.05, frame: 0.12, cols: 4, transoms: [5.95, 7.35, 8.75], bar: 0.1 });
  b.add('glassDark', ...g.glass).add('mullionBlack', ...g.frame);
  b.add('jointBeige', box(BAY, 6, 0.4, 0, 4.4, -0.2));
  // Friso beige sobre el vidrio, cornisa y frontón.
  b.add('creamPlaster', box(BAY, LEVELS.pilaster - 10.15, 4, 0, 10.15, -1.85));
  b.add('creamPlaster', box(BAY + 0.3, 0.18, 4.2, 0, LEVELS.pilaster - 0.18, -1.8));
  const gable = profilePrism([new Vector2(-half, LEVELS.pilaster), new Vector2(half, LEVELS.pilaster), new Vector2(0, LEVELS.apex)], 4);
  gable.translate(0, 0, 0.2);
  b.add('creamPlaster', gable);
  // Dintel con letras y acceso vidriado hundido.
  b.add('creamPlaster', box(BAY + 0.4, 1.75, 2.4, 0, 2.8, -0.9));
  const edificio = await textGeometry('EDIFICIO', { height: 0.26, depth: 0.04, font: 'DejaVu Serif', weight: 'bold' });
  edificio.translate(0, 3.95, 0.3);
  const nombre = await textGeometry('FERNANDO CHAIJ', { height: 0.62, depth: 0.05, font: 'DejaVu Serif', weight: 'normal' });
  nombre.translate(0, 3.15, 0.3);
  b.add('letters', edificio, nombre);
  const door = { x: 0, y: LEVELS.floor, w: BAY - 0.4, h: 2.35 };
  const gd = glazing(door, { z: -1.9, cols: 5, transoms: [LEVELS.floor + 2.0], frame: 0.08 });
  b.add('glassDark', ...gd.glass).add('mullionBlack', ...gd.frame);
  // Escalinata de hormigón con barandas.
  for (let k = 0; k < 3; k++) b.add('concreteGrey', box(BAY + 2.4, LEVELS.floor - k * 0.15, 0.42, 0, 0, 0.6 + 0.21 + k * 0.42));
  for (const x of [-(BAY / 2 + 1.0), BAY / 2 + 1.0, 0]) {
    for (const z of [0.7, 1.9]) b.add('aluminium', cylinder(0.03, 0.03, 0.95, x, LEVELS.floor - (z - 0.6) * 0.36, z, 8));
    b.add('aluminium', box(0.06, 0.06, 1.5, x, LEVELS.floor + 0.72, 1.3));
  }
}

export async function buildBiblioteca(bd: BuildingData): Promise<HeroModel<M>> {
  const b = new HeroBuilder<M>();
  const fp = relativeTo(bd.footprint, bd.centroid);
  const front = edgeFrame(fp[FRONT_EDGE]!, fp[FRONT_EDGE + 1]!);
  const L = len(sub(fp[FRONT_EDGE + 1]!, fp[FRONT_EDGE]!));
  // Basamento (piso de la galería) con fundación para la pendiente.
  b.add('concreteGrey', footprintPrism(insetPolygon(fp, -0.4, true), -4, LEVELS.floor));
  upperMass(b, fp);
  claddings(b, fp);
  gallery(b, fp, L / 2);
  await centralBody(b.at(front, 0, L / 2, 0));
  return { builder: b, materials: BIBLIOTECA_MATERIALS };
}
