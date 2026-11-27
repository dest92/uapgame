/**
 * Templo UAP (way/388500961). Referencias: reference/web/way-388500961/01.jpg (frontal) y 02.jpg (3/4).
 * Nave en abanico con la fachada sobre el arco SE del footprint (mira a calle Marshall). Fachada, de
 * izquierda a derecha vista desde la explanada: ala con zócalo de laja, cuerpo con 3 ventanas apuntadas,
 * pilono con logo IASD, cuerpo central, pilono con paneles de cobre, cuerpo, ala. Accesos vidriados bajo
 * marquesinas en los tres cuerpos. Al SO, el volumen color arena de la Facultad de Teología.
 */
import type { BuildingData } from '@shared/world/types';
import { ensureCCW } from '@shared/geo/polygon';
import type { Vec2 } from '@shared/geo/types';
import { HeroBuilder } from '../lib/builder';
import { angleOf, fitCircle, framesAlongArc, relativeTo } from '../lib/frame';
import { BASE_MATERIALS, type MaterialSpec } from '../lib/materials';
import { glazing } from '../lib/openings';
import { type Opening, box, footprintPrism, profilePrism, roundedTopProfile, wallSlab } from '../lib/parts';
import { svgGeometry, textGeometry } from '../lib/text';
import { flatRoofMass, windowRows } from '../lib/walls';
import { IASD_LOGO } from '../lib/logos';
import type { BufferGeometry } from 'three';
import type { HeroModel } from './types';

export const TEMPLO_MATERIALS = {
  ...BASE_MATERIALS,
  stoneGrey: { color: '#a19e96', roughness: 0.9, texture: 'stone', uvScale: 1.5 },
  copper: { color: '#a8775a', roughness: 0.45, metalness: 0.6 },
  engraving: { color: '#3a2a20', roughness: 0.6, metalness: 0.2 },
  plaza: { color: '#c2c2bf', roughness: 0.85, texture: 'plazaTiles', uvScale: 6 },
  stainedGlass: { color: '#163070', roughness: 0.1, metalness: 0.1, emissive: '#081636' },
} as const satisfies Record<string, MaterialSpec>;
type M = keyof typeof TEMPLO_MATERIALS;

/** Índices del footprint de OSM: arco de la fachada (3..8) y nave en abanico (3..17). */
const ARC = [3, 8] as const;
const NAVE_END = 17;

type Kind = 'wing' | 'body' | 'center' | 'pylonL' | 'pylonR';
interface Element { readonly kind: Kind; readonly w: number; readonly h: number; readonly z: number }

/** Composición de la fachada (anchos de arco en metros, alturas, adelanto respecto del arco). */
export const TEMPLO_FACADE: readonly Element[] = [
  { kind: 'wing', w: 7, h: 10.5, z: -0.4 },
  { kind: 'body', w: 6.5, h: 13, z: 0 },
  { kind: 'pylonL', w: 7, h: 16.5, z: 1.2 },
  { kind: 'center', w: 7, h: 13.4, z: 0 },
  { kind: 'pylonR', w: 7, h: 16.5, z: 1.2 },
  { kind: 'body', w: 6.5, h: 13, z: 0 },
  { kind: 'wing', w: 7, h: 10.5, z: -0.4 },
];

const SLAB = 0.9;
const FACADE_WIDTH = TEMPLO_FACADE.reduce((s, e) => s + e.w, 0);
const MASS_DEPTH = 9;

/** Cuerpo con vanos: puertas vidriadas, marquesina, banda vidriada y 3 ventanas apuntadas. */
function body(b: HeroBuilder<M>, e: Element): void {
  const w = e.w + 0.2;
  const door: Opening = { x: 0, y: 0, w: e.w - 1.0, h: 3.0 };
  const band: Opening = { x: 0, y: 3.6, w: e.w - 1.4, h: 1.35 };
  const tall: Opening[] = [-1.9, 0, 1.9].map((x) => ({ x, y: 5.7, w: 0.95, h: 6.6, kind: 'pointed' }));
  b.add('plasterWhite', wallSlab(w, e.h, SLAB, [door, band, ...tall]));
  b.add('plasterWhite', box(w, e.h, MASS_DEPTH, 0, 0, -SLAB - MASS_DEPTH / 2));
  // Cupertina fina sobre el parapeto.
  b.add('concreteWhite', box(w + 0.12, 0.14, SLAB + 0.12, 0, e.h, -SLAB / 2 + 0.06));
  for (const t of tall) {
    // Vitral: vidrio azul profundo con trama de plomo (parteluz + travesaños cada ~0.8 m) y marco bronce.
    const lead = glazing(t, { z: -0.24, frame: 0.02, cols: 2, transoms: Array.from({ length: 6 }, (_, k) => t.y + 0.8 * (k + 1)), bar: 0.025 });
    const g = glazing(t, { z: -0.25, frame: 0.08, transoms: [t.y + 2.0, t.y + 3.9], bar: 0.07 });
    b.add('stainedGlass', ...g.glass).add('bronze', ...g.frame).add('aluminiumDark', ...lead.frame);
  }
  const gb = glazing(band, { z: -0.3, cols: 2, frame: 0.08 });
  b.add('glassDark', ...gb.glass).add('bronze', ...gb.frame);
  const gd = glazing(door, { z: -SLAB + 0.12, cols: 4, transoms: [2.35], frame: 0.08 });
  b.add('glassDark', ...gd.glass).add('aluminiumDark', ...gd.frame);
  // Marquesina plana blanca y piso del pórtico.
  b.add('concreteWhite', box(e.w + 0.8, 0.24, 2.0, 0, 3.1, 1.0));
  b.add('concreteGrey', box(door.w, 0.05, SLAB, 0, 0, -SLAB / 2));
}

function pylon(b: HeroBuilder<M>, e: Element): void {
  b.add('plasterWhite', profilePrism(roundedTopProfile(e.w, e.h, 1.5), MASS_DEPTH + SLAB + e.z));
  // Zócalo apenas marcado.
  b.add('concreteWhite', box(e.w + 0.04, 0.35, 0.06, 0, 0, 0.02));
}

async function pylonLeftDecor(b: HeroBuilder<M>): Promise<void> {
  const logo = await svgGeometry(IASD_LOGO, 1.55, 0.06);
  logo.translate(0, 12.0, 0);
  const iasd = await textGeometry('IGLESIA\nADVENTISTA\nDEL SÉPTIMO DÍA', { height: 1.25, depth: 0.05, font: 'DejaVu Serif', lineHeight: 1.05 });
  iasd.translate(0, 10.55, 0);
  const uap = await textGeometry('Universidad\nAdventista del Plata', { height: 0.62, depth: 0.04, font: 'DejaVu Sans', weight: 'normal' });
  uap.translate(0, 7.3, 0);
  b.add('bronze', logo, iasd, uap);
}

/** Placas ocre "Mi casa será llamada casa de oración para todos los pueblos" (Isaías 56:7, 02.jpg). */
async function pylonRightDecor(b: HeroBuilder<M>): Promise<void> {
  b.add('copper',
    box(1.0, 1.2, 0.07, -0.75, 12.3, 0.035), box(1.0, 1.0, 0.07, 0.85, 12.0, 0.035),
    box(1.0, 4.4, 0.07, -0.75, 6.6, 0.035), box(1.0, 4.4, 0.07, 0.85, 6.4, 0.035));
  const t = (s: string, h: number): Promise<BufferGeometry> => textGeometry(s, { height: h, depth: 0.02, font: 'DejaVu Serif', weight: 'normal', lineHeight: 1.0 });
  const mi = await t('Mi\ncasa', 0.62);
  mi.translate(-0.75, 12.6, 0.07);
  const sera = await t('será\nllamada', 0.5);
  sera.translate(0.85, 12.25, 0.07);
  // Placas altas: texto vertical que se lee de abajo hacia arriba.
  const v1 = await t('Casa de\noración', 0.66);
  v1.rotateZ(Math.PI / 2);
  v1.translate(-0.75 + 0.33, 8.8, 0.07);
  const v2 = await t('para todos\nlos pueblos', 0.66);
  v2.rotateZ(Math.PI / 2);
  v2.translate(0.85 + 0.33, 8.6, 0.07);
  b.add('engraving', mi, sera, v1, v2);
}

function wing(b: HeroBuilder<M>, e: Element): void {
  const w = e.w + 0.2;
  const wins: Opening[] = [-0.85, 0.85].map((x) => ({ x, y: 4.4, w: 0.7, h: 5.0 }));
  b.add('plasterWhite', wallSlab(w, e.h, SLAB, wins));
  b.add('plasterWhite', box(w, e.h, MASS_DEPTH, 0, 0, -SLAB - MASS_DEPTH / 2));
  b.add('concreteWhite', box(w + 0.12, 0.14, SLAB + 0.12, 0, e.h, -SLAB / 2 + 0.06));
  for (const o of wins) {
    const g = glazing(o, { z: -0.25, transoms: [o.y + 1.7, o.y + 3.4] });
    b.add('glassBlue', ...g.glass).add('bronze', ...g.frame);
  }
  // Zócalo de piedra laja gris.
  b.add('stoneGrey', box(w + 0.1, 3.3, 0.14, 0, 0, 0.07));
  b.add('concreteWhite', box(w + 0.16, 0.1, 0.22, 0, 3.3, 0.06));
}

/** Explanada frente a la fachada: baldosas gris medio con dibujo geométrico gris claro (textura procedural, 02.jpg). */
function plaza(b: HeroBuilder<M>, c: Vec2, r: number, a0: number, a1: number): void {
  const steps = 28;
  for (let i = 0; i < steps; i++) {
    const t0 = a0 + ((a1 - a0) * i) / steps;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / steps;
    const ring = (rad: number, t: number): Vec2 => ({ x: c.x + Math.cos(t) * rad, z: c.z + Math.sin(t) * rad });
    const quad = ensureCCW([ring(r - 0.5, t0), ring(r + 15, t0), ring(r + 15, t1), ring(r - 0.5, t1)]);
    b.add('plaza', footprintPrism(quad, -1.2, 0.03));
  }
}

export async function buildTemplo(bd: BuildingData): Promise<HeroModel<M>> {
  const b = new HeroBuilder<M>();
  const fp = relativeTo(bd.footprint, bd.centroid);
  const arcPts = fp.slice(ARC[0], ARC[1] + 1);
  const { center, radius } = fitCircle(arcPts);
  const aLeft = angleOf(center, fp[ARC[0]]!);
  const frames = framesAlongArc(center, radius, aLeft, TEMPLO_FACADE.map((e) => e.w));
  const decor: Promise<void>[] = [];
  TEMPLO_FACADE.forEach((e, i) => {
    const local = b.at(frames[i]!, 0, 0, e.z);
    // Fundación bajo el nivel de acceso (terreno en pendiente).
    local.add(e.kind === 'wing' ? 'stoneGrey' : 'plasterWhite', box(e.w + 0.2, 4, MASS_DEPTH, 0, -4, -MASS_DEPTH / 2));
    if (e.kind === 'pylonL' || e.kind === 'pylonR') {
      pylon(local, e);
      if (e.kind === 'pylonL') decor.push(pylonLeftDecor(local));
      else decor.push(pylonRightDecor(local));
    } else if (e.kind === 'wing') wing(local, e);
    else body(local, e);
  });
  await Promise.all(decor);

  // Nave en abanico detrás de la fachada (techo oculto tras el parapeto) y volumen de la FT al SO.
  // El frente de la nave sigue el arco ajustado, retirado detrás de las losas de fachada (las cuerdas del
  // footprint sobresalen hasta ~0.5 m del arco y taparían las ventanas).
  const aRight = aLeft - FACADE_WIDTH / radius;
  const back: Vec2[] = Array.from({ length: 13 }, (_, i) => {
    const a = aLeft + ((aRight - aLeft) * i) / 12;
    return { x: center.x + Math.cos(a) * (radius - 2), z: center.z + Math.sin(a) * (radius - 2) };
  });
  const nave = ensureCCW([...back, ...fp.slice(ARC[1] + 1, NAVE_END + 1)]);
  flatRoofMass(b, nave, { wall: 'plasterWhite', roof: 'roofMembrane', coping: 'concreteWhite', height: 11.6, parapet: 0.7 });
  // Laterales de la nave: ventanas altas y angostas como las de las alas (se omite el frente retirado).
  const naveFront = new Set(nave.map((p, i) => (back.includes(p) && back.includes(nave[(i + 1) % nave.length]!) ? i : -1)).filter((i) => i >= 0));
  windowRows(b, nave, { glass: 'glassBlue', frame: 'bronze', rows: [4.4], width: 0.7, height: 5.0, spacing: 4.5, margin: 2, minEdge: 6 }, naveFront);
  const west = ensureCCW([...fp.slice(NAVE_END), ...fp.slice(0, ARC[0] + 1)]);
  flatRoofMass(b, west, { wall: 'plasterSand', roof: 'roofMembrane', coping: 'concreteWhite', height: 7.0, parapet: 0.6 });
  const shared = west.findIndex((p, i) => {
    const q = west[(i + 1) % west.length]!;
    const isEnd = (v: Vec2): boolean => v === fp[NAVE_END] || v === fp[ARC[0]];
    return isEnd(p) && isEnd(q);
  });
  windowRows(b, west, { glass: 'glassDark', frame: 'aluminium', sill: 'concreteWhite', rows: [1.0, 4.3], width: 1.5, height: 1.6, spacing: 2.6 }, new Set([shared]));
  plaza(b, center, radius, aLeft + 0.05, aRight - 0.05);
  return { builder: b, materials: TEMPLO_MATERIALS };
}
