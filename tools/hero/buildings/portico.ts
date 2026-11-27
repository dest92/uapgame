/**
 * Pórtico de acceso (way/388521996), estado 2026. Referencias: reference/web/way-388521996/01–04.jpg.
 * El polígono de OSM es el arco escultórico que cruza el acceso vehicular desde calle 25 de Mayo:
 * dos pilares troncopiramidales de piedra laja color arena unidos por cintas de hormigón blanco
 * (arco sobre los pilares, viga horizontal que remata en una "C" a la izquierda y un bucle a la derecha).
 * Suma la garita (base de ladrillo, vidrio, techo plano verde grisáceo), el mástil, y la plaza de 2026:
 * adoquines grises, bancos orgánicos marrones, tótem "UAP" y farolas de columna gris.
 * El edificio de ladrillo de 2 pisos con las letras es relation/16816367 (ver edificio-cap.ts).
 */
import { Vector2 } from 'three';
import type { BuildingData } from '@shared/world/types';
import type { Vec2 } from '@shared/geo/types';
import { HeroBuilder } from '../lib/builder';
import { type Frame2, add, lerp2, norm, relativeTo, scale, sub } from '../lib/frame';
import { BASE_MATERIALS, type MaterialSpec } from '../lib/materials';
import { arcPoints, box, cylinder, flatShape, frustum, ribbon } from '../lib/parts';
import { textGeometry } from '../lib/text';
import type { HeroModel } from './types';

export const PORTICO_MATERIALS = {
  ...BASE_MATERIALS,
  stoneSand: { color: '#b89c74', roughness: 0.9, texture: 'stone', uvScale: 1.5 },
  ribbonWhite: { color: '#ece8dc', roughness: 0.75, texture: 'concrete', uvScale: 2 },
  brick: { color: '#84462f', roughness: 0.9, texture: 'brick', uvScale: 1.0 },
  roofGreen: { color: '#6d7768', roughness: 0.7, metalness: 0.2 },
  cobbles: { color: '#a3a39f', roughness: 0.9, texture: 'paving', uvScale: 2.5 },
  benchBrown: { color: '#7a5e4c', roughness: 0.6 },
  totemGrey: { color: '#a9adb0', roughness: 0.5, metalness: 0.3 },
  signWhite: { color: '#f2f2f0', roughness: 0.4 },
  signNavy: { color: '#1d2b4a', roughness: 0.4 },
  fenceGreen: { color: '#2f5a3c', roughness: 0.5, metalness: 0.5 },
  flagBlue: { color: '#74acdf', roughness: 0.8, doubleSided: true },
  flagWhite: { color: '#f4f4f4', roughness: 0.8, doubleSided: true },
} as const satisfies Record<string, MaterialSpec>;
type M = keyof typeof PORTICO_MATERIALS;

/** Medidas del arco (metros), estimadas de 01/02.jpg con personas y el ancho del acceso como escala. */
export const ARCH = {
  pillarSpacing: 7.2,
  pillarHeight: 5.6,
  pillarBase: 2.0,
  pillarTop: 1.35,
  beamY: 4.85,
  archRise: 3.0,
  ribbonWidth: 1.6,
  ribbonThickness: 0.3,
} as const;

/** Eje largo del polígono (SO → NE) y punto donde lo cruza el camino de acceso. */
function archFrame(fp: readonly Vec2[], road: Vec2): Frame2 {
  const sw = lerp2(fp[4]!, fp[5]!, 0.5);
  const ne = lerp2(fp[8]!, fp[9]!, 0.5);
  const tangent = norm(sub(ne, sw));
  const t = (road.x - sw.x) * tangent.x + (road.z - sw.z) * tangent.z;
  return { origin: add(sw, scale(tangent, t)), tangent, normal: { x: -tangent.z, z: tangent.x } };
}

function arch(b: HeroBuilder<M>): void {
  const { pillarSpacing: s, pillarHeight: h, beamY, archRise, ribbonWidth: w, ribbonThickness: t } = ARCH;
  const px = s / 2;
  for (const x of [-px, px]) {
    b.add('stoneSand', frustum(ARCH.pillarBase, ARCH.pillarTop, h, x, 0, 0), box(ARCH.pillarBase, 2, ARCH.pillarBase, x, -2, 0));
    b.add('concreteGrey', box(ARCH.pillarBase + 0.3, 0.25, ARCH.pillarBase + 0.3, x, 0, 0));
  }
  // Arco: media elipse apoyada sobre los pilares.
  b.add('ribbonWhite', ribbon(arcPoints(0, h - 0.1, px, archRise, Math.PI, 0, 28), w * 1.05, t));
  // Viga horizontal que atraviesa los pilares, "C" a la izquierda y bucle a la derecha.
  const cx = -px - 3.6;
  const cR = beamY / 2 - 0.1;
  const leftC = arcPoints(cx, beamY - cR, cR * 0.9, cR, Math.PI / 2, Math.PI * 1.5, 26);
  const beam = [new Vector2(px + 3.2, beamY), new Vector2(cx, beamY)];
  const loopR = 0.55;
  const hairpin = arcPoints(px + 3.2, beamY - loopR, loopR, loopR, Math.PI / 2, -Math.PI / 2, 10);
  const descent = [new Vector2(px + 3.2, beamY - 2 * loopR), new Vector2(px + 0.7, 2.7)];
  const foot = [new Vector2(cx + 0.2, 0.25), new Vector2(cx + 1.6, 0.25)];
  const path = [...hairpin.reverse(), ...beam, ...leftC.slice(1), ...foot.slice(1)];
  b.add('ribbonWhite', ribbon(path, w, t));
  b.add('ribbonWhite', ribbon(descent, w * 0.85, t));
  // Base del pie de la "C".
  b.add('concreteGrey', box(2.0, 0.25, 1.4, cx + 1.0, 0, 0));
}

function gatehouse(b: HeroBuilder<M>): void {
  const w = 4.2, d = 3.4, h = 2.9;
  b.add('brick', box(w, 2.0, d, 0, -1.0, 0));
  b.add('glassDark', box(w - 0.1, h - 1.0, d - 0.1, 0, 1.0, 0));
  for (const x of [-w / 2 + 0.05, 0, w / 2 - 0.05]) b.add('aluminiumDark', box(0.08, h - 1.0, d + 0.02, x, 1.0, 0));
  b.add('roofGreen', box(w + 1.0, 0.35, d + 1.0, 0, h, 0));
  b.add('concreteWhite', box(w - 0.2, 0.05, d - 0.2, 0, h + 0.35, 0));
}

function flagpole(b: HeroBuilder<M>): void {
  b.add('aluminium', cylinder(0.05, 0.1, 12, 0, 0, 0, 10));
  b.add('concreteGrey', box(0.8, 0.4, 0.8, 0, 0, 0));
  const stripe = (y: number, mat: M): void => {
    const s = flatShape([new Vector2(0.1, y), new Vector2(2.2, y), new Vector2(2.2, y + 0.45), new Vector2(0.1, y + 0.45)], 0);
    b.add(mat, s);
  };
  stripe(11.0, 'flagBlue');
  stripe(10.55, 'flagWhite');
  stripe(10.1, 'flagBlue');
}

async function totem(b: HeroBuilder<M>): Promise<void> {
  b.add('totemGrey', box(1.15, 3.1, 0.45, 0, 0, 0));
  b.add('signWhite', box(1.0, 1.0, 0.04, 0, 2.0, 0.24));
  b.add('signNavy', box(0.92, 0.92, 0.02, 0, 2.04, 0.265));
  const uap = await textGeometry('UAP', { height: 0.34, depth: 0.03, font: 'DejaVu Sans', weight: 'bold' });
  uap.translate(0, 2.3, 0.275);
  b.add('signWhite', uap);
}

/** Banco de forma orgánica: losa de canto redondeado sobre dos patas. */
function bench(b: HeroBuilder<M>, length: number): void {
  const r = 0.28;
  const outline = [...arcPoints(length / 2 - r, 0, r, r, -Math.PI / 2, Math.PI / 2, 8), ...arcPoints(-length / 2 + r, 0, r, r, Math.PI / 2, Math.PI * 1.5, 8)];
  const seat = flatShape(outline, 0);
  seat.rotateX(-Math.PI / 2);
  seat.translate(0, 0.47, 0);
  b.add('benchBrown', seat, box(length - 0.1, 0.1, 0.5, 0, 0.36, 0));
  for (const x of [-length / 3, length / 3]) b.add('benchBrown', box(0.18, 0.36, 0.42, x, 0, 0));
}

function streetLamp(b: HeroBuilder<M>): void {
  b.add('steelGrey', cylinder(0.06, 0.09, 4.6, 0, 0, 0, 10), cylinder(0.32, 0.06, 0.45, 0, 4.6, 0, 14));
}

export async function buildPortico(bd: BuildingData, world: { roads: readonly { id: string; points: readonly Vec2[] }[] }): Promise<HeroModel<M>> {
  const b = new HeroBuilder<M>();
  const fp = relativeTo(bd.footprint, bd.centroid);
  const access = world.roads.find((r) => r.id === 'way/731799612');
  const crossing = access ? sub(access.points[2]!, bd.centroid) : { x: 0, z: 0 };
  const f = archFrame(fp, crossing);
  const a = b.at(f);
  arch(a);
  // Garita al NE del pilar derecho (POI "Prevención"), mástil detrás.
  gatehouse(a.at({ origin: { x: ARCH.pillarSpacing / 2 + 3.6, z: -0.6 }, tangent: { x: 1, z: 0 }, normal: { x: 0, z: 1 } }));
  flagpole(a.at({ origin: { x: ARCH.pillarSpacing / 2 + 3.0, z: -4.0 }, tangent: { x: 1, z: 0 }, normal: { x: 0, z: 1 } }));
  // Plaza 2026 entre la garita y el edificio de ladrillo (paralelo al eje del arco, ~7 m detrás).
  const plaza: Vec2[] = [{ x: 6.5, z: 2.5 }, { x: 24, z: 2.5 }, { x: 24, z: -6.2 }, { x: 6.5, z: -6.2 }];
  const plazaPrism = flatShape(plaza.map((p) => new Vector2(p.x, -p.z)), 0);
  plazaPrism.rotateX(-Math.PI / 2);
  plazaPrism.translate(0, 0.04, 0);
  a.add('cobbles', plazaPrism);
  a.add('concreteGrey', box(17.5, 1.04, 8.7, 15.25, -1.0, -1.85));
  const place = (x: number, z: number, yaw = 0): HeroBuilder<M> => a.at({ origin: { x, z }, tangent: { x: Math.cos(yaw), z: -Math.sin(yaw) }, normal: { x: Math.sin(yaw), z: Math.cos(yaw) } });
  await totem(place(12.5, 0.2));
  bench(place(9.5, -1.6, 0.25), 2.6);
  bench(place(15.5, -2.2, -0.2), 3.2);
  bench(place(19.5, -1.0, 0.15), 2.4);
  bench(place(10.8, -4.4, -0.1), 2.0);
  for (const [x, z] of [[8.0, 1.8], [17.5, 1.8], [23.0, -5.5]] as const) streetLamp(place(x, z));
  // Reja metálica verde sobre el borde de la plaza hacia el edificio.
  for (let x = 7; x < 23.5; x += 2.4) {
    const fence = place(x + 1.2, -6.4);
    fence.add('fenceGreen', box(2.4, 0.06, 0.05, 0, 0.1, 0), box(2.4, 0.06, 0.05, 0, 1.75, 0), box(0.08, 1.85, 0.08, -1.2, 0, 0));
    for (let k = 0; k < 16; k++) fence.add('fenceGreen', box(0.025, 1.7, 0.025, -1.1 + k * 0.14, 0.1, 0));
  }
  return { builder: b, materials: PORTICO_MATERIALS };
}
