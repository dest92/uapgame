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
