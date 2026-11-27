import { describe, it, expect } from 'vitest';
import { buildBuildingGeometry } from '../../src/world/buildings/BuildingGeometryBuilder';
import { orientedBox } from '../../src/world/buildings/obb';
import { triangleArea } from '../../src/world/geometry/GeometryData';
import { makeWorld } from '../fixtures/world';

const base = makeWorld().buildings[0]!; // 20×10 m, 6.4 m, flat

describe('orientedBox', () => {
  it('detecta eje largo y rectangularidad 1 en un rectángulo', () => {
    const obb = orientedBox(base.footprint);
    expect(obb.halfU).toBeCloseTo(10);
    expect(obb.halfV).toBeCloseTo(5);
    expect(obb.rectangularity).toBeCloseTo(1);
  });
});

describe('buildBuildingGeometry', () => {
  it('paredes: 4 quads con altura = suelo + height y fundación bajo el suelo', () => {
    const g = buildBuildingGeometry(base, 2);
    const ys = [];
    for (let i = 1; i < g.walls.positions.length; i += 3) ys.push(g.walls.positions[i]!);
    expect(Math.max(...ys)).toBeCloseTo(2 + 6.4 + 0.6, 5); // parapeto de techo plano
    expect(Math.min(...ys)).toBeLessThan(2);
  });
  it('techo plano: losa interior + anillo de parapeto ≈ área del footprint (sin doble cobertura)', () => {
    const g = buildBuildingGeometry(base, 0);
    const area = triangleArea(g.roof);
    expect(area).toBeGreaterThan(199);
    expect(area).toBeLessThan(201);
  });
  it('las normales de las paredes apuntan hacia afuera', () => {
    const g = buildBuildingGeometry(base, 0);
    const c = base.centroid;
    for (let i = 0; i < g.walls.positions.length / 3; i += 4) {
      const px = g.walls.positions[i * 3]!;
      const pz = g.walls.positions[i * 3 + 2]!;
      const nx = g.walls.normals[i * 3]!;
      const nz = g.walls.normals[i * 3 + 2]!;
      // El vector (p - centroide) y la normal no deben oponerse en paredes exteriores.
      if (Math.abs(nx) + Math.abs(nz) > 0.5 && g.walls.extra[i * 3 + 2]! === 0) {
        expect((px - c.x) * nx + (pz - c.z) * nz).toBeGreaterThan(-1e-6);
      }
    }
  });
  it('techo a dos aguas: cumbrera a suelo + height + roof.height', () => {
    const gabled = { ...base, roof: { shape: 'gabled' as const, height: 3 } };
    const g = buildBuildingGeometry(gabled, 0);
    const ys = [];
    for (let i = 1; i < g.roof.positions.length; i += 3) ys.push(g.roof.positions[i]!);
    expect(Math.max(...ys)).toBeCloseTo(6.4 + 3, 1); // cumbrera (+ cenefa de 2 cm)
    expect(triangleArea(g.roof)).toBeGreaterThan(200);
  });
  it('techo a cuatro aguas también se genera', () => {
    const g = buildBuildingGeometry({ ...base, roof: { shape: 'hipped', height: 2.5 } }, 0);
    expect(g.roof.indices.length).toBeGreaterThan(0);
  });
  it('colores de vértice salen de la apariencia (sRGB → lineal)', () => {
    const g = buildBuildingGeometry(base, 0);
    expect(g.walls.colors.length).toBe(g.walls.positions.length);
    expect(g.walls.colors[0]).toBeGreaterThan(0);
  });
});
