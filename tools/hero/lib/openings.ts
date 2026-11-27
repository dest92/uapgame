/**
 * Carpinterías dentro de vanos: vidrio, marco perimetral, parteluces y travesaños como geometría.
 * Mismo marco local que parts.ts (vano en el plano X-Y, la fachada mira a +Z).
 */
import { type BufferGeometry, ExtrudeGeometry, Path, Shape } from 'three';
import { type Opening, box, flatShape, openingOutline } from './parts';

export interface GlazingOptions {
  /** Profundidad del vidrio respecto de la cara de la fachada (negativa = hundido). */
  readonly z: number;
  /** Ancho visto del marco perimetral. */
  readonly frame?: number;
  /** Cantidad de paños verticales (parteluces = cols − 1). */
  readonly cols?: number;
  /** Alturas absolutas de travesaños. */
  readonly transoms?: readonly number[];
  readonly bar?: number;
}

export interface Glazing {
  readonly glass: BufferGeometry[];
  readonly frame: BufferGeometry[];
}

/** Vidrio + carpintería de un vano. */
export function glazing(o: Opening, opt: GlazingOptions): Glazing {
  const f = opt.frame ?? 0.07;
  const bar = opt.bar ?? 0.05;
  const depth = 0.08;
  const outline = openingOutline(o);
  const inner = openingOutline({ ...o, x: o.x, y: o.y + f, w: Math.max(0.05, o.w - 2 * f), h: Math.max(0.05, o.h - 2 * f) });
  const ring = new Shape(outline);
  ring.holes.push(new Path(inner));
  const ringGeo = new ExtrudeGeometry(ring, { depth, bevelEnabled: false, curveSegments: 4 }).toNonIndexed();
  ringGeo.translate(0, 0, opt.z - depth / 2);
  const frame: BufferGeometry[] = [ringGeo];
  const cols = opt.cols ?? 1;
  const kind = o.kind ?? 'rect';
  const straightTop = kind === 'rect' ? o.y + o.h : kind === 'circle' ? o.y + o.h : o.y + o.h - o.w * (kind === 'pointed' ? Math.sin(Math.PI / 3) : 0.5);
  for (let i = 1; i < cols; i++) {
    const x = o.x - o.w / 2 + (o.w * i) / cols;
    frame.push(box(bar, straightTop - o.y, depth, x, o.y, opt.z));
  }
  for (const y of opt.transoms ?? []) frame.push(box(o.w, bar, depth, o.x, y - bar / 2, opt.z));
  return { glass: [flatShape(outline, opt.z - 0.01)], frame };
}

/** Moldura (archivolta/marco) alrededor de un vano: anillo de ancho `width` que sobresale `depth` de z. */
export function moldingRing(o: Opening, width: number, depth: number, z = 0): BufferGeometry {
  const outer = openingOutline(o.kind === 'circle' ? { ...o, y: o.y - width, w: o.w + 2 * width, h: o.h + 2 * width } : { ...o, w: o.w + 2 * width, h: o.h + width });
  const ring = new Shape(outer);
  ring.holes.push(new Path(openingOutline(o)));
  const g = new ExtrudeGeometry(ring, { depth, bevelEnabled: false, curveSegments: 6 }).toNonIndexed();
  g.translate(0, 0, z);
  return g;
}
