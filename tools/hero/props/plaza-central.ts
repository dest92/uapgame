/**
 * Hitos de la plaza central frente a la Biblioteca (se incluyen en su GLB vía `siteFor`):
 * - Fuente UAP (OSM way/388495174): pileta circular baja con borde de hormigón, agua y surtidores
 *   (05.jpg de la Biblioteca muestra los chorros; radio tomado del polígono OSM ≈ 2.2 m), solado circular,
 *   bancos y farolas de globo blanco como en 02.jpg.
 * - Cancha de básquet celeste/rosa (foto de dron del usuario, 2026). No está en OSM ni en la ortofoto 2013:
 *   su ubicación (césped al S de la fuente, alineada con el sendero) es ESTIMADA.
 */
import { Vector2 } from 'three';
import type { Vec2 } from '@shared/geo/types';
import type { WorldData } from '@shared/world/types';
import type { HeroBuilder } from '../lib/builder';
import type { MaterialSpec } from '../lib/materials';
import { arcPoints, box, cylinder, flatShape, ringPrism, footprintPrism } from '../lib/parts';
import type { Site } from '../lib/site';

export const PLAZA_MATERIALS = {
  basinConcrete: { color: '#d9d6cf', roughness: 0.8, texture: 'concrete', uvScale: 1.5 },
  water: { color: '#2f5f73', roughness: 0.05, metalness: 0.2 },
  jet: { color: '#e8f4f8', roughness: 0.3, emissive: '#3a4a50' },
  plazaPaving: { color: '#bdb6aa', roughness: 0.85, texture: 'paving', uvScale: 2 },
  courtBlue: { color: '#4fa6d8', roughness: 0.7 },
  courtPink: { color: '#e58f9a', roughness: 0.7 },
  courtLine: { color: '#f4f4f2', roughness: 0.6 },
  hoopRed: { color: '#c0392b', roughness: 0.5, metalness: 0.3 },
  globeWhite: { color: '#f7f7f2', roughness: 0.3, emissive: '#2a2a26' },
  lampPost: { color: '#3b3f42', roughness: 0.5, metalness: 0.6 },
  benchWood: { color: '#8a6440', roughness: 0.7 },
} as const satisfies Record<string, MaterialSpec>;
type P = keyof typeof PLAZA_MATERIALS;
/** Builder de un edificio cuya paleta incluye la de la plaza (P ⊆ M). */
type WithPlaza<M extends string> = P extends M ? HeroBuilder<M> : never;
const asPlaza = <M extends string>(b: WithPlaza<M>): HeroBuilder<P> => b as unknown as HeroBuilder<P>;

const ring = (c: Vec2, r: number, n = 32): Vec2[] => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return { x: c.x + Math.cos(a) * r, z: c.z - Math.sin(a) * r };
});

function globeLamp(b: HeroBuilder<P>): void {
  b.add('lampPost', cylinder(0.05, 0.07, 3.3, 0, 0, 0, 10), cylinder(0.14, 0.14, 0.2, 0, 0, 0, 12));
  b.add('globeWhite', cylinder(0.22, 0.22, 0.42, 0, 3.3, 0, 14), cylinder(0.12, 0.22, 0.1, 0, 3.72, 0, 14));
}

function bench(b: HeroBuilder<P>): void {
  b.add('benchWood', box(1.8, 0.06, 0.45, 0, 0.44, 0), box(1.8, 0.4, 0.05, 0, 0.5, -0.22));
  for (const x of [-0.75, 0.75]) b.add('lampPost', box(0.06, 0.44, 0.45, x, 0, 0));
}

/** Fuente circular con solado y mobiliario, centrada en el polígono de OSM. */
export function fountain<M extends string>(host: WithPlaza<M>, site: Site, world: WorldData): void {
  const b = asPlaza(host);
  const area = world.areas.find((a) => a.id === 'way/388495174');
  if (!area) return;
  const c = { x: area.polygon.reduce((s, p) => s + p.x, 0) / area.polygon.length, z: area.polygon.reduce((s, p) => s + p.z, 0) / area.polygon.length };
  const r = area.polygon.reduce((s, p) => s + Math.hypot(p.x - c.x, p.z - c.z), 0) / area.polygon.length;
  const f = site.at(b, c);
  const o = { x: 0, z: 0 };
  f.add('plazaPaving', footprintPrism(ring(o, r + 3.2), -0.6, 0.04));
  f.add('basinConcrete', ringPrism(ring(o, r), ring(o, r - 0.3), -0.6, 0.5), ringPrism(ring(o, r + 0.08), ring(o, r - 0.38), 0.5, 0.58));
  const water = flatShape(ring(o, r - 0.3).map((p) => new Vector2(p.x, -p.z)), 0);
  water.rotateX(-Math.PI / 2);
  water.translate(0, 0.32, 0);
  f.add('water', water);
  // Surtidores: chorro central y anillo de chorros bajos (conos claros).
  f.add('basinConcrete', cylinder(0.35, 0.45, 0.45, 0, 0, 0, 16));
  f.add('jet', cylinder(0.04, 0.16, 1.6, 0, 0.45, 0, 10));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    f.add('jet', cylinder(0.02, 0.07, 0.7, Math.cos(a) * (r - 0.8), 0.32, Math.sin(a) * (r - 0.8), 8));
  }
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k / 4) * Math.PI * 2;
    globeLamp(f.at({ origin: { x: Math.cos(a) * (r + 2.6), z: Math.sin(a) * (r + 2.6) }, tangent: { x: 1, z: 0 }, normal: { x: 0, z: 1 } }));
    const tb = { x: -Math.sin(a + Math.PI / 4), z: Math.cos(a + Math.PI / 4) };
    const pos = { x: Math.cos(a + Math.PI / 4) * (r + 2.4), z: Math.sin(a + Math.PI / 4) * (r + 2.4) };
    bench(f.at({ origin: pos, tangent: { x: -tb.x, z: -tb.z }, normal: { x: tb.z, z: -tb.x } }));
  }
}

/** Cancha de básquet celeste con zonas rosas, líneas, aros y alambrado bajo (ubicación estimada). */
export function basketballCourt<M extends string>(host: WithPlaza<M>, site: Site, center: Vec2, axis: Vec2): void {
  const b = asPlaza(host);
  const L = 28, W = 15;
  const ct = site.at(b, center, axis);
  ct.add('plazaPaving', box(L + 4, 0.6, W + 4, 0, -0.56, 0));
  ct.add('courtBlue', box(L + 2, 0.02, W + 2, 0, 0.04, 0));
  for (const s of [-1, 1]) {
    // Llave (rosa) y semicírculo, aros con poste y tablero.
    ct.add('courtPink', box(5.8, 0.02, 4.9, s * (L / 2 - 2.9), 0.05, 0));
    const a0 = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    const g = flatShape(arcPoints(s * (L / 2 - 5.8), 0, 1.8, 1.8, a0, a0 + Math.PI, 12), 0);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0.055, 0);
    ct.add('courtPink', g);
    ct.add('courtLine', box(0.06, 0.012, W, s * (L / 2), 0.06, 0));
    ct.add('lampPost', cylinder(0.08, 0.08, 3.05, s * (L / 2 + 1.0), 0, 0, 10), box(0.08, 0.08, 1.2, s * (L / 2 + 0.5), 2.95, 0));
    ct.add('courtLine', box(0.05, 1.05, 1.8, s * (L / 2 - 0.1), 2.6, 0));
    ct.add('hoopRed', cylinder(0.23, 0.23, 0.03, s * (L / 2 - 0.45), 3.05, 0, 14));
  }
  ct.add('courtLine', box(L, 0.012, 0.06, 0, 0.06, W / 2), box(L, 0.012, 0.06, 0, 0.06, -W / 2), box(0.06, 0.012, W, 0, 0.06, 0));
  ct.add('courtLine', cylinder(1.8, 1.8, 0.012, 0, 0.055, 0, 24));
  ct.add('courtPink', cylinder(1.7, 1.7, 0.014, 0, 0.056, 0, 24));
}
