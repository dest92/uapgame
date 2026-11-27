/**
 * Helpers de volúmenes secundarios: masas de footprint con parapeto y techo, y ventanas aplicadas
 * sobre sus aristas (vidrio + marco + alféizar como geometría, sin perforar el muro).
 */
import type { Vec2 } from '@shared/geo/types';
import type { HeroBuilder } from './builder';
import { edgeFrame, insetPolygon, len, sub } from './frame';
import { box, flatShape, footprintPrism, openingOutline, ringPrism } from './parts';

export interface MassOptions<M extends string> {
  readonly wall: M;
  readonly roof: M;
  readonly coping?: M;
  readonly height: number;
  readonly parapet?: number;
  readonly wallThickness?: number;
  /** Profundidad de la fundación bajo Y = 0 (cubre el lado bajo en terrenos con pendiente). */
  readonly foundation?: number;
}

/** Masa de muros perimetrales con parapeto, techo plano rehundido y cupertina. `poly` CCW en mapa. */
export function flatRoofMass<M extends string>(b: HeroBuilder<M>, poly: readonly Vec2[], o: MassOptions<M>): void {
  const t = o.wallThickness ?? 0.35;
  const parapet = o.parapet ?? 0.6;
  const inner = insetPolygon(poly, t, true);
  b.add(o.wall, ringPrism(poly, inner, -(o.foundation ?? 4), o.height + parapet));
  b.add(o.roof, footprintPrism(inner, o.height - 0.1, o.height));
  if (o.coping) b.add(o.coping, ringPrism(insetPolygon(poly, -0.04, true), insetPolygon(poly, t + 0.04, true), o.height + parapet, o.height + parapet + 0.06));
}

export interface WindowRowOptions<M extends string> {
  readonly glass: M;
  readonly frame: M;
  readonly sill?: M;
  /** Alturas de antepecho de cada fila (una por piso). */
  readonly rows: readonly number[];
  readonly width: number;
  readonly height: number;
  /** Distancia entre ejes de ventanas. */
  readonly spacing: number;
  /** Margen libre en cada extremo de la arista. */
  readonly margin?: number;
  readonly minEdge?: number;
  /** Celosía de lamas horizontales delante del vidrio (cantidad de lamas). */
  readonly louvers?: number;
  readonly louverMat?: M;
  /** Omite ventanas puntuales (p.ej. detrás de un acceso): arista y posición sobre ella. */
  readonly skipAt?: (edge: number, x: number) => boolean;
}

/** Ventanas regulares aplicadas sobre cada arista de `poly` (CCW en mapa) salvo las indicadas en `skip`. */
export function windowRows<M extends string>(b: HeroBuilder<M>, poly: readonly Vec2[], o: WindowRowOptions<M>, skip: ReadonlySet<number> = new Set()): void {
  const margin = o.margin ?? 1.2;
  poly.forEach((a, i) => {
    if (skip.has(i)) return;
    const c = poly[(i + 1) % poly.length]!;
    const L = len(sub(c, a));
    if (L < (o.minEdge ?? 3)) return;
    const n = Math.max(1, Math.floor((L - 2 * margin) / o.spacing) + 1);
    const span = (n - 1) * o.spacing;
    const f = edgeFrame(a, c, 0);
    const local = b.at(f);
    for (let k = 0; k < n; k++) {
      const x = L / 2 - span / 2 + k * o.spacing;
      if (o.skipAt?.(i, x)) continue;
      for (const y of o.rows) {
        const outline = openingOutline({ x, y, w: o.width, h: o.height });
        local.add(o.glass, flatShape(outline, 0.03));
        const fw = 0.06;
        local.add(o.frame,
          box(o.width + fw * 2, fw, 0.1, x, y - fw, 0.03),
          box(o.width + fw * 2, fw, 0.1, x, y + o.height, 0.03),
          box(fw, o.height, 0.1, x - o.width / 2 - fw / 2, y, 0.03),
          box(fw, o.height, 0.1, x + o.width / 2 + fw / 2, y, 0.03));
        if (o.sill) local.add(o.sill, box(o.width + 0.2, 0.06, 0.22, x, y - 0.12, 0.08));
        if (o.louvers) {
          const step = o.height / o.louvers;
          for (let k = 0; k < o.louvers; k++) {
            local.add(o.louverMat ?? o.frame, box(o.width, step * 0.55, 0.05, x, y + k * step + step * 0.25, 0.1));
          }
        }
      }
    }
  });
}

/** Rectángulo en el plano de una fachada (x a lo largo, y altura) que interrumpe un revestimiento. */
export interface Rect2 {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

export interface PanelGridOptions<M extends string> {
  readonly panel: M;
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  /** Tamaño nominal de placa (se ajusta para cubrir el paño exacto). */
  readonly pw: number;
  readonly ph: number;
  readonly gap?: number;
  readonly thickness?: number;
  /** Zonas sin placas (ventanas, cuerpos salientes). */
  readonly skip?: readonly Rect2[];
}

/** Revestimiento de placas con juntas reales (cada placa es una caja apenas saliente). */
export function panelGrid<M extends string>(b: HeroBuilder<M>, o: PanelGridOptions<M>): void {
  const gap = o.gap ?? 0.025;
  const t = o.thickness ?? 0.04;
  const nx = Math.max(1, Math.round((o.x1 - o.x0) / o.pw));
  const ny = Math.max(1, Math.round((o.y1 - o.y0) / o.ph));
  const pw = (o.x1 - o.x0) / nx;
  const ph = (o.y1 - o.y0) / ny;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const x0 = o.x0 + i * pw, x1 = x0 + pw, y0 = o.y0 + j * ph, y1 = y0 + ph;
      if (o.skip?.some((r) => x0 < r.x1 && x1 > r.x0 && y0 < r.y1 && y1 > r.y0)) continue;
      b.add(o.panel, box(pw - gap, ph - gap, t, (x0 + x1) / 2, y0 + gap / 2, t / 2));
    }
  }
}
