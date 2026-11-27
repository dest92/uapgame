import { describe, it, expect } from 'vitest';
import { buildBuildingGeometry } from '../../src/world/buildings/BuildingGeometryBuilder';
import { WIN_DEPTH, DOOR_DEPTH } from '../../src/world/buildings/FacadeDetailBuilder';
import { layoutWall } from '@shared/world/facadeGrammar';
import { makeWorld } from '../fixtures/world';

const base = makeWorld().buildings[0]!; // 20×10 m, 6.4 m, techo plano, entrada al sur (z = 10)

const verts = (g: { positions: number[]; normals: number[] }) =>
  Array.from({ length: g.positions.length / 3 }, (_, i) => ({
    p: [g.positions[i * 3]!, g.positions[i * 3 + 1]!, g.positions[i * 3 + 2]!],
    n: [g.normals[i * 3]!, g.normals[i * 3 + 1]!, g.normals[i * 3 + 2]!],
  }));

describe('geometría de fachada cercana (FAC-2..4)', () => {
  const g = buildBuildingGeometry(base, 0);

  it('FAC-2: un vidrio por vano (ventanas de la gramática + puerta)', () => {
    const wallH = 6.4 + 0.6;
    const expected = [20, 10, 20, 10].reduce((s, L, i) => s + layoutWall({ length: L, height: wallH, ...(i === 1 ? { doorU: 5 } : {}) }).openings.length, 0);
    // 4 vértices por vidrio.
    expect(g.glass.positions.length / 12).toBe(expected);
  });

  it('FAC-2: los vidrios están hundidos 13–25 cm detrás del plomo del muro', () => {
    for (const { p } of verts(g.glass)) {
      const inside = Math.min(p[0]!, 20 - p[0]!, p[2]!, 10 - p[2]!);
      expect(inside).toBeGreaterThan(0.12);
      expect(inside).toBeLessThan(Math.max(WIN_DEPTH, DOOR_DEPTH));
    }
  });

  it('FAC-3: el muro cercano es distinto del lejano y tiene huecos (más vértices)', () => {
    expect(g.walls).not.toBe(g.far);
    expect(g.walls.positions.length).toBeGreaterThan(g.far.positions.length * 4);
    expect(g.walls.extra.filter((_, i) => i % 3 === 2).some((z) => z === 2)).toBe(true);
  });

  it('FAC-3: área de muro cercano en el plomo = área de fachada − vanos', () => {
    let area = 0;
    for (let i = 0; i < g.walls.indices.length; i += 3) {
      const k = [g.walls.indices[i]!, g.walls.indices[i + 1]!, g.walls.indices[i + 2]!];
      if (!k.every((v) => g.walls.extra[v * 3 + 2] === 2)) continue;
      const P = k.map((v) => [g.walls.positions[v * 3]!, g.walls.positions[v * 3 + 1]!, g.walls.positions[v * 3 + 2]!]);
      const u = P[1]!.map((x, j) => x - P[0]![j]!);
      const w = P[2]!.map((x, j) => x - P[0]![j]!);
      area += Math.hypot(u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!) / 2;
    }
    const wallH = 6.4 + 0.6;
    const height = wallH + 1.5; // desde la fundación
    let holes = 0;
    [20, 10, 20, 10].forEach((L, i) => {
      for (const o of layoutWall({ length: L, height: wallH, ...(i === 1 ? { doorU: 5 } : {}) }).openings) holes += (o.u1 - o.u0) * (o.v1 - o.v0);
    });
    expect(area).toBeCloseTo(60 * height - holes, 3);
  });

  it('FAC-3: ningún vértice del muro cercano sale del volumen del edificio (salvo molduras)', () => {
    for (const { p } of verts(g.walls)) {
      expect(p[0]).toBeGreaterThanOrEqual(-1e-6);
      expect(p[0]).toBeLessThanOrEqual(20 + 1e-6);
      expect(p[2]).toBeGreaterThanOrEqual(-1e-6);
      expect(p[2]).toBeLessThanOrEqual(10 + 1e-6);
    }
  });

  it('FAC-3: normales unitarias y, en el plomo del muro, hacia afuera', () => {
    verts(g.walls).forEach(({ p, n }, i) => {
      expect(Math.hypot(n[0]!, n[1]!, n[2]!)).toBeCloseTo(1, 5);
      // Muro en el plomo (flag 2); los retiros (flag 1) miran hacia el vano.
      if (g.walls.extra[i * 3 + 2] === 2) {
        const out = (p[0]! - 10) * n[0]! + (p[2]! - 5) * n[2]!;
        expect(out).toBeGreaterThan(0);
      }
    });
  });

  it('FAC-4: hay puerta en la pared de la entrada (vidrio marcado como puerta, a nivel del suelo)', () => {
    const doors = [];
    for (let i = 0; i < g.glass.colors.length / 3; i++) if (g.glass.colors[i * 3 + 1] === 1) doors.push(g.glass.positions[i * 3 + 2]!);
    expect(doors.length).toBe(4);
    for (const z of doors) expect(z).toBeGreaterThan(9.7);
  });

  it('FAC-4: molduras siempre visibles (zócalo, coronamiento, marquesina) y presupuesto de triángulos', () => {
    expect(g.trimAlways.indices.length).toBeGreaterThan(0);
    const tris = (g.walls.indices.length + g.trim.indices.length + g.glass.indices.length + g.trimAlways.indices.length) / 3;
    expect(tris).toBeLessThan(6000);
  });
});
