import { describe, expect, it } from 'vitest';
import { Box3, BufferGeometry, Vector3 } from 'three';
import { HeroBuilder } from '../../../tools/hero/lib/builder';
import { edgeFrame, insetPolygon } from '../../../tools/hero/lib/frame';
import { arcPoints, box, footprintPrism, loft, openingOutline, ribbon, wallSlab } from '../../../tools/hero/lib/parts';
import { panelGrid } from '../../../tools/hero/lib/walls';

const bounds = (g: BufferGeometry): Box3 => new Box3().setFromBufferAttribute(g.getAttribute('position') as never);
const triangles = (g: BufferGeometry): number => g.getAttribute('position').count / 3;
/** Suma de áreas de triángulos cuya normal geométrica mira a +Z (cara frontal de una losa). */
function frontArea(g: BufferGeometry): number {
  const p = g.getAttribute('position');
  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  let s = 0;
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    if (n.z > 0 && Math.abs(a.z) < 1e-6 && Math.abs(b.z) < 1e-6 && Math.abs(c.z) < 1e-6) s += n.length() / 2;
  }
  return s;
}

describe('piezas paramétricas', () => {
  it('openingOutline: el arco apuntado llega a la altura pedida y queda dentro del ancho', () => {
    const pts = openingOutline({ x: 1, y: 2, w: 1, h: 5, kind: 'pointed' });
    expect(Math.max(...pts.map((p) => p.y))).toBeCloseTo(7);
    expect(Math.min(...pts.map((p) => p.x))).toBeCloseTo(0.5);
    expect(Math.max(...pts.map((p) => p.x))).toBeCloseTo(1.5);
  });

  it('wallSlab: los vanos (incluida una puerta en la base) se restan de la cara frontal', () => {
    const solid = frontArea(wallSlab(6, 10, 0.5));
    const withHoles = frontArea(wallSlab(6, 10, 0.5, [{ x: 0, y: 0, w: 2, h: 3 }, { x: 0, y: 5, w: 1, h: 2 }]));
    expect(solid).toBeCloseTo(60, 3);
    expect(withHoles).toBeCloseTo(60 - 6 - 2, 3);
    const bb = bounds(wallSlab(6, 10, 0.5));
    expect(bb.min.z).toBeCloseTo(-0.5);
    expect(bb.max.z).toBeCloseTo(0);
  });

  it('footprintPrism respeta el footprint en X-Z (Z = Sur) y las alturas', () => {
    const bb = bounds(footprintPrism([{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: -3 }, { x: 0, z: -3 }], -1, 6));
    expect([bb.min.x, bb.max.x, bb.min.y, bb.max.y, bb.min.z, bb.max.z]).toEqual([0, 4, -1, 6, -3, 0].map((v) => expect.closeTo(v, 6)));
  });

  it('loft: todos los faldones del techo miran hacia arriba', () => {
    const poly = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: -8 }, { x: 0, z: -8 }];
    const g = loft(insetPolygon(poly, -0.5, true), insetPolygon(poly, 2, true), 6, 7);
    const n = g.getAttribute('normal');
    for (let i = 0; i < n.count; i++) expect(n.getY(i)).toBeGreaterThan(0);
  });

  it('ribbon: la cinta sigue la curva con el espesor pedido', () => {
    const g = ribbon(arcPoints(0, 0, 3, 3, Math.PI, 0, 16), 1.2, 0.2);
    const bb = bounds(g);
    expect(bb.max.y).toBeCloseTo(3.1, 2);
    expect(bb.max.z - bb.min.z).toBeCloseTo(1.2);
    expect(triangles(g)).toBe(16 * 8 + 4);
  });

  it('panelGrid omite las placas que pisan una ventana', () => {
    const b = new HeroBuilder<'p'>();
    panelGrid(b, { panel: 'p', x0: 0, x1: 6, y0: 0, y1: 4, pw: 2, ph: 2, skip: [{ x0: 2.5, x1: 3.5, y0: 0, y1: 4 }] });
    const merged = b.merged(() => 1).get('p')!;
    expect(triangles(merged)).toBe(4 * 12); // 6 placas − 2 de la columna central
  });

  it('HeroBuilder.at ubica la pieza en el marco (frente hacia la normal)', () => {
    const b = new HeroBuilder<'m'>();
    b.at(edgeFrame({ x: 0, z: 0 }, { x: 10, z: 0 }), 0, 5, 0).add('m', box(1, 1, 1, 0, 0, 2));
    const bb = bounds(b.merged(() => 1).get('m')!);
    expect(bb.getCenter(new Vector3()).x).toBeCloseTo(5);
    expect(bb.getCenter(new Vector3()).z).toBeCloseTo(2); // la normal de la arista sur apunta a +Z
  });
});
