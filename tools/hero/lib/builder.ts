/**
 * Acumula geometría por material con una pila de marcos locales y la fusiona para exportar.
 * Las UV se recalculan en coordenadas del modelo (metros) para que las texturas tengan escala real
 * en cualquier orientación de muro.
 */
import { BufferAttribute, type BufferGeometry, Matrix4, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { type Frame2, yawOf } from './frame';

export class HeroBuilder<M extends string> {
  private readonly parts = new Map<M, BufferGeometry[]>();

  constructor(private readonly matrix = new Matrix4(), private readonly root?: HeroBuilder<M>) {}

  /** Sub-builder ubicado en un marco del plano (origen sobre el suelo + `y`), con desplazamiento local opcional. */
  at(f: Frame2, y = 0, dx = 0, dz = 0): HeroBuilder<M> {
    const m = new Matrix4().makeRotationY(yawOf(f));
    m.setPosition(f.origin.x, y, f.origin.z);
    m.multiply(new Matrix4().makeTranslation(dx, 0, dz));
    return new HeroBuilder<M>(this.matrix.clone().multiply(m), this.root ?? this);
  }

  /** Sub-builder con una transformación local arbitraria. */
  transform(m: Matrix4): HeroBuilder<M> {
    return new HeroBuilder<M>(this.matrix.clone().multiply(m), this.root ?? this);
  }

  add(mat: M, ...geos: BufferGeometry[]): this {
    const target = this.root ?? this;
    for (const g of geos) {
      g.applyMatrix4(this.matrix);
      const list = target.parts.get(mat) ?? [];
      list.push(g);
      target.parts.set(mat, list);
    }
    return this;
  }

  /**
   * Geometría fusionada por material, con UV planares en metros divididas por `uvScale(mat)` y, si
   * `variation(mat)` > 0, color de vértice con AO horneado (sofitos y pie de muro más oscuros) y una
   * leve variación de tono por pieza que rompe la uniformidad (técnica "Voidlight", R7).
   */
  merged(uvScale: (mat: M) => number, variation: (mat: M) => number = () => 0): Map<M, BufferGeometry> {
    const out = new Map<M, BufferGeometry>();
    let piece = 0;
    for (const [mat, list] of this.parts) {
      const v = variation(mat);
      const clean = list.map((g) => {
        for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
        if (v > 0) bakeVertexColor(g, 1 + (hash01(++piece) - 0.5) * 2 * v);
        return g;
      });
      const g = mergeGeometries(clean, false);
      if (!g) throw new Error(`No se pudo fusionar la geometría de ${mat}`);
      planarUv(g, uvScale(mat));
      out.set(mat, g);
    }
    return out;
  }
}

/**
 * UV por cara: superficies horizontales usan (x, z); verticales usan (distancia horizontal sobre el
 * plano del muro, y). Exacto para muros en cualquier rumbo.
 */
export function planarUv(g: BufferGeometry, scale: number): void {
  const pos = g.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), n = new Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    n.subVectors(c, b).cross(new Vector3().subVectors(a, b)).normalize();
    for (let k = 0; k < 3; k++) {
      const p = k === 0 ? a : k === 1 ? b : c;
      let u: number, v: number;
      if (Math.abs(n.y) > 0.7) {
        u = p.x; v = p.z;
      } else {
        const h = Math.hypot(n.x, n.z) || 1;
        u = (p.x * -n.z + p.z * n.x) / h;
        v = p.y;
      }
      uv[(i + k) * 2] = u / scale;
      uv[(i + k) * 2 + 1] = v / scale;
    }
  }
  g.setAttribute('uv', new BufferAttribute(uv, 2));
}

/** Hash determinista en [0, 1). */
export const hash01 = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * AO de vértice: caras que miran hacia abajo (sofitos, aleros) ×0.7 y vértices a menos de 0.5 m del
 * nivel de acceso ×0.82 (contacto con el suelo), multiplicado por el tinte de la pieza.
 */
export function bakeVertexColor(g: BufferGeometry, tint: number): void {
  const pos = g.getAttribute('position');
  const nrm = g.getAttribute('normal');
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    let ao = tint;
    if (nrm && nrm.getY(i) < -0.5) ao *= 0.7;
    const y = pos.getY(i);
    if (y < 0.5 && y > -1) ao *= 0.82 + 0.18 * Math.max(0, y / 0.5);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = Math.min(1, ao);
  }
  g.setAttribute('color', new BufferAttribute(col, 3));
}
