/**
 * Salón de los Pioneros (way/388512621, "Iglesia de los Pioneros"). Referencias:
 * reference/web/way-388512621/01.jpg (2014, frontal) y 02.jpg (2018, colores actuales: muros rosa viejo,
 * pilastras crema). Fachada neogótica plana sobre el extremo NE (arista 4→0) con remate escalonado,
 * 6 pilastras terminadas en pináculos apuntados, óculo, ventanas lanceoladas y acceso en arco apuntado.
 * Detrás, nave de un nivel alto con techo a dos aguas oculto tras el remate.
 */
import { Vector2 } from 'three';
import type { BuildingData } from '@shared/world/types';
import { HeroBuilder } from '../lib/builder';
import { edgeFrame, insetPolygon, len, relativeTo, sub } from '../lib/frame';
import { BASE_MATERIALS, type MaterialSpec } from '../lib/materials';
import { glazing, moldingRing } from '../lib/openings';
import { type Opening, box, openingOutline, profilePrism, ringPrism } from '../lib/parts';
import { windowRows } from '../lib/walls';
import type { HeroModel } from './types';

export const PIONEROS_MATERIALS = {
  ...BASE_MATERIALS,
  pinkWall: { color: '#bb938d', roughness: 0.9, texture: 'plaster', uvScale: 3 },
  cream: { color: '#ece3cf', roughness: 0.85, texture: 'plaster', uvScale: 3 },
  wood: { color: '#7a3a22', roughness: 0.6 },
  frameCopper: { color: '#a8664a', roughness: 0.5, metalness: 0.4 },
  sheetRoof: { color: '#6f7273', roughness: 0.55, metalness: 0.5 },
  flagstone: { color: '#c7beb3', roughness: 0.9, texture: 'stone', uvScale: 2.2 },
} as const satisfies Record<string, MaterialSpec>;
type M = keyof typeof PIONEROS_MATERIALS;

const FRONT_EDGE = 4;
const NAVE_H = 7.0;
/** Pilastras: centro, ancho y altura del pináculo (simétricas), medidas de 01.jpg con la puerta como escala. */
export const PILASTERS: readonly { x: number; w: number; top: number }[] = [
  { x: 7.1, w: 1.6, top: 9.6 },
  { x: 5.5, w: 1.25, top: 10.3 },
  { x: 2.4, w: 1.0, top: 11.4 },
];

/** Perfil de pilastra con remate apuntado. */
const pinnacle = (w: number, top: number): Vector2[] => openingOutline({ x: 0, y: 0, w, h: top, kind: 'pointed' });

const DOOR: Opening = { x: 0, y: 0, w: 2.9, h: 4.1, kind: 'pointed' };

/** Contorno del muro de fachada con remate escalonado y la muesca del acceso (antihorario). */
function frontProfile(): Vector2[] {
  const steps: [number, number][] = [[7.9, 8.6], [6.3, 8.6], [6.3, 9.3], [4.6, 9.3], [4.6, 9.9], [2.9, 9.9], [2.9, 10.5], [1.2, 10.5], [1.2, 11.1], [0, 11.1]];
  const right = steps.map(([x, y]) => new Vector2(x, y));
  const left = [...steps].reverse().slice(1).map(([x, y]) => new Vector2(-x, y));
  const doorTop = openingOutline(DOOR).slice(2).reverse();
  return [new Vector2(-7.9, 0), new Vector2(-DOOR.w / 2, 0), ...doorTop, new Vector2(DOOR.w / 2, 0), new Vector2(7.9, 0), ...right, ...left];
}

function facade(b: HeroBuilder<M>): void {
  const door = DOOR;
  const oculus: Opening = { x: 0, y: 5.75, w: 1.5, h: 1.5, kind: 'circle' };
  const lancets: Opening[] = [-3.95, 3.95].map((x) => ({ x, y: 4.7, w: 1.0, h: 2.4, kind: 'pointed' }));
  const lower: Opening[] = [-3.95, 3.95].map((x) => ({ x, y: 1.3, w: 1.15, h: 2.4 }));
  const t = 0.6;
  // Muro con vanos reales: losa del contorno escalonado con huecos (el acceso es una muesca del contorno).
  const slab = profilePrism(frontProfile(), t, [oculus, ...lancets, ...lower]);
  b.add('pinkWall', slab);
  // Acceso: fondo y hoja de madera hundidos.
  b.add('cream', box(3.3, 4.6, 1.2, 0, 0, -t - 0.6));
  b.add('wood', box(2.3, 2.5, 0.08, 0, 0, -t - 0.02));
  b.add('cream', moldingRing(door, 0.28, 0.14, 0), moldingRing(oculus, 0.18, 0.12, 0));
  for (const o of lancets) b.add('cream', moldingRing(o, 0.2, 0.12, 0));
  for (const o of [...lancets, oculus]) {
    const g = glazing(o, { z: -0.25, frame: 0.06, transoms: o.kind === 'circle' ? [o.y + 0.75] : [o.y + 0.6, o.y + 1.2], cols: 2, bar: 0.04 });
    b.add('glassBlue', ...g.glass).add('frameCopper', ...g.frame);
  }
  for (const o of lower) {
    const g = glazing(o, { z: -0.25, frame: 0.06, cols: 2, transoms: [o.y + 0.6, o.y + 1.2, o.y + 1.8], bar: 0.04 });
    b.add('glassDark', ...g.glass).add('frameCopper', ...g.frame);
    b.add('cream', box(o.w + 0.4, 0.1, 0.25, o.x, o.y - 0.12, 0.05));
  }
  // Pilastras crema con pináculo, sobresalen 0.35 m.
  for (const p of PILASTERS) for (const s of [-1, 1]) {
    const g = profilePrism(pinnacle(p.w, p.top), t + 0.35);
    g.translate(s * p.x, 0, 0.35);
    b.add('cream', g);
  }
  // Vereda de laja frente al acceso.
  b.add('flagstone', box(18, 0.06, 6, 0, -0.02, 3));
}

export async function buildPioneros(bd: BuildingData): Promise<HeroModel<M>> {
  const b = new HeroBuilder<M>();
  const fp = relativeTo(bd.footprint, bd.centroid);
  const a = fp[FRONT_EDGE]!, c = fp[0]!;
  const W = len(sub(c, a));
  // La fachada va por delante del muro frontal de la nave (si no, lo tapa y hay z-fighting).
  const front = b.at(edgeFrame(a, c), 0, W / 2, 0.62);
  // Nave: muros rosa, ventanas laterales, techo a dos aguas de chapa.
  b.add('pinkWall', ringPrism(fp, insetPolygon(fp, 0.35, true), -4, NAVE_H));
  windowRows(b, fp, { glass: 'glassDark', frame: 'frameCopper', sill: 'cream', rows: [2.4], width: 1.0, height: 2.8, spacing: 4.0, margin: 2.5, minEdge: 20 }, new Set([FRONT_EDGE]));
  const length = len(sub(fp[1]!, fp[0]!));
  const roof = profilePrism([new Vector2(-W / 2 - 0.4, NAVE_H - 0.1), new Vector2(W / 2 + 0.4, NAVE_H - 0.1), new Vector2(0, NAVE_H + 2.6)], length);
  roof.translate(0, 0, -0.65);
  front.add('sheetRoof', roof);
  front.add('cream', box(W + 0.2, 4, 1.5, 0, -4, -0.75));
  facade(front);
  return { builder: b, materials: PIONEROS_MATERIALS };
}
