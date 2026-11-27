/**
 * Letras y logos 3D: se rasteriza SVG con sharp, se vectoriza (marching squares) y se extruye.
 * Resultado en el marco local de las piezas: centrado en x = 0, base en y = 0, sobresale de z = 0 a z = depth.
 */
import sharp from 'sharp';
import { type BufferGeometry, ExtrudeGeometry, Path, Shape, Vector2 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { traceMask } from './contours';

export interface TextOptions {
  /** Altura de la caja del texto (metros). */
  readonly height: number;
  readonly depth: number;
  readonly font?: string;
  readonly weight?: string;
  /** Interlineado relativo cuando hay varias líneas (separadas por \n). */
  readonly lineHeight?: number;
  /** Resolución de rasterizado (píxeles por metro). */
  readonly ppm?: number;
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Extruye una máscara RGBA/gris de sharp: px → metros con `ppm`, centrado en X y apoyado en y = 0. */
async function extrudeRaster(png: Buffer, ppm: number, depth: number): Promise<BufferGeometry> {
  const { data, info } = await sharp(png).flatten({ background: '#000' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const outlines = traceMask(new Uint8Array(data), info.width, info.height, 128, 0.7);
  if (!outlines.length) throw new Error('extrudeRaster: máscara vacía');
  let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const o of outlines) for (const p of o.outer) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  const cx = (minX + maxX) / 2;
  const toV = (p: { x: number; y: number }): Vector2 => new Vector2((p.x - cx) / ppm, (maxY - p.y) / ppm);
  const shapes = outlines.map((o) => {
    const s = new Shape(o.outer.map(toV));
    for (const h of o.holes) s.holes.push(new Path(h.map(toV)));
    return s;
  });
  const g = new ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 1 });
  const out = g.toNonIndexed();
  g.dispose();
  return out;
}

/** Texto 3D (una o varias líneas centradas). */
export async function textGeometry(text: string, o: TextOptions): Promise<BufferGeometry> {
  const ppm = o.ppm ?? 220;
  const lines = text.split('\n');
  const lh = o.lineHeight ?? 1.15;
  const fontPx = (o.height * ppm) / (1 + (lines.length - 1) * lh);
  const width = Math.ceil(fontPx * 0.75 * Math.max(...lines.map((l) => l.length)) + fontPx);
  const height = Math.ceil(fontPx * (1.3 + (lines.length - 1) * lh));
  const tspans = lines.map((l, i) => `<tspan x="${width / 2}" y="${fontPx * (1 + i * lh)}">${esc(l)}</tspan>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#000"/>` +
    `<text font-family="${o.font ?? 'DejaVu Sans'}" font-weight="${o.weight ?? 'bold'}" font-size="${fontPx}" fill="#fff" text-anchor="middle">${tspans}</text></svg>`;
  return extrudeRaster(await sharp(Buffer.from(svg)).png().toBuffer(), ppm, o.depth);
}

/** Logo/figura 3D desde un SVG propio (relleno blanco sobre fondo transparente o negro). */
export async function svgGeometry(svg: string, widthMeters: number, depth: number): Promise<BufferGeometry> {
  const img = sharp(Buffer.from(svg));
  const meta = await img.metadata();
  const ppm = (meta.width ?? 1) / widthMeters;
  return extrudeRaster(await img.png().toBuffer(), ppm, depth);
}

export const mergeAll = (geos: BufferGeometry[]): BufferGeometry => {
  const g = mergeGeometries(geos, false);
  if (!g) throw new Error('mergeAll: atributos incompatibles');
  return g;
};
