import type { Vec2 } from '@shared/geo/types';
import type { AreaKind } from '@shared/world/featureRules';
import type { WorldData } from '@shared/world/types';

/**
 * Pinta un "splat map" del suelo en un canvas: cada canal codifica una capa
 * (R = pasto cuidado, G = tierra/grava, B = pavimento/hormigón). El alfa no se usa:
 * el canvas 2D premultiplica y perdería datos.
 * Los materiales TSL del terreno mezclan texturas según estos pesos (VEG/MAT).
 */
export interface SplatLayers {
  readonly lawn: number;
  readonly dirt: number;
  readonly paved: number;
}

const AREA_SPLAT: Readonly<Record<AreaKind, SplatLayers>> = {
  park: { lawn: 1, dirt: 0, paved: 0 },
  garden: { lawn: 1, dirt: 0.1, paved: 0 },
  grass: { lawn: 0.8, dirt: 0, paved: 0 },
  pitch: { lawn: 1, dirt: 0, paved: 0 },
  sports: { lawn: 0.5, dirt: 0.2, paved: 0.2 },
  parking: { lawn: 0, dirt: 0, paved: 1 },
  plaza: { lawn: 0, dirt: 0, paved: 1 },
  water: { lawn: 0, dirt: 0, paved: 1 },
  track: { lawn: 0, dirt: 1, paved: 0 },
};

/** Orden de pintado: lo de abajo primero. */
const ORDER: readonly AreaKind[] = ['grass', 'park', 'garden', 'sports', 'track', 'pitch', 'parking', 'plaza', 'water'];

export function paintSplatMap(world: WorldData, pxPerMeter: number, maxSize: number): HTMLCanvasElement {
  const { bounds } = world;
  const w = bounds.maxX - bounds.minX;
  const d = bounds.maxZ - bounds.minZ;
  const scale = Math.min(pxPerMeter, maxSize / Math.max(w, d));
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * scale);
  canvas.height = Math.ceil(d * scale);
  const ctx = canvas.getContext('2d')!;
  const toPx = (p: Vec2): [number, number] => [(p.x - bounds.minX) * scale, (p.z - bounds.minZ) * scale];
  const rgba = (s: SplatLayers): string =>
    `rgb(${Math.round(s.lawn * 255)},${Math.round(s.dirt * 255)},${Math.round(s.paved * 255)})`;
  const HARD_COURTS = new Set(['tennis', 'basketball', 'volleyball', 'multi', 'padel']);

  // Fondo: pasto silvestre (lawn medio + algo de tierra).
  ctx.fillStyle = rgba({ lawn: 0.55, dirt: 0.25, paved: 0 });
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const fillPoly = (poly: readonly Vec2[], style: string): void => {
    ctx.beginPath();
    poly.forEach((p, i) => (i ? ctx.lineTo(...toPx(p)) : ctx.moveTo(...toPx(p))));
    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
  };
  for (const kind of ORDER) {
    for (const a of world.areas.filter((x) => x.kind === kind)) {
      const hard = kind === 'pitch' && HARD_COURTS.has(a.sport ?? '');
      fillPoly(a.polygon, rgba(hard ? AREA_SPLAT.parking : AREA_SPLAT[kind]));
    }
  }

  // Veredas perimetrales de edificios (1.2 m) y desgaste junto a caminos.
  ctx.lineJoin = 'round';
  for (const b of world.buildings) {
    ctx.lineWidth = 2.4 * scale;
    ctx.strokeStyle = rgba({ lawn: 0, dirt: 0.1, paved: 1 });
    ctx.beginPath();
    b.footprint.forEach((p, i) => (i ? ctx.lineTo(...toPx(p)) : ctx.moveTo(...toPx(p))));
    ctx.closePath();
    ctx.stroke();
    fillPoly(b.footprint, rgba({ lawn: 0, dirt: 0, paved: 1 }));
  }
  ctx.lineCap = 'round';
  for (const r of world.roads) {
    ctx.lineWidth = (r.width + (r.class === 'road' ? 3.5 : 1.2)) * scale;
    ctx.strokeStyle = r.class === 'road' ? rgba({ lawn: 0, dirt: 0.15, paved: 1 }) : rgba({ lawn: 0.25, dirt: 0.6, paved: 0 });
    ctx.beginPath();
    r.points.forEach((p, i) => (i ? ctx.lineTo(...toPx(p)) : ctx.moveTo(...toPx(p))));
    ctx.stroke();
  }
  return canvas;
}
