import { describe, it, expect } from 'vitest';
import { buildRoadGeometry, resamplePolyline } from '../../src/world/roads/RoadGeometryBuilder';
import { HeightField } from '@shared/terrain/heightField';
import type { RoadData } from '@shared/world/types';

const flat = HeightField.flat(0);
const road: RoadData = { id: 'w/1', class: 'road', highway: 'residential', width: 6, surface: 'asphalt', points: [{ x: 0, z: 0 }, { x: 30, z: 0 }] };

describe('RoadGeometryBuilder (ROAD-1)', () => {
  it('resample divide segmentos largos', () => {
    expect(resamplePolyline(road.points, 3).length).toBe(11);
  });
  it('ROAD-1: la calzada tiene el ancho del dato', () => {
    const g = buildRoadGeometry(road, flat);
    const zs: number[] = [];
    for (let i = 2; i < g.surface.positions.length; i += 3) zs.push(g.surface.positions[i]!);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(6, 5);
  });
  it('ROAD-1: las calles tienen cordón elevado; los senderos borde bajo (altura sobre la calzada)', () => {
    const rise = (r: RoadData): number => {
      const g = buildRoadGeometry(r, flat);
      const maxY = (arr: number[]): number => Math.max(...arr.filter((_, i) => i % 3 === 1));
      return maxY(g.curb.positions) - maxY(g.surface.positions);
    };
    expect(rise(road)).toBeCloseTo(0.15, 5);
    expect(rise({ ...road, class: 'path', highway: 'footway', width: 2 })).toBeLessThan(0.1);
  });
  it('ROAD-1: ninguna normal es nula (caras verticales del cordón iluminadas)', () => {
    const g = buildRoadGeometry(road, flat);
    for (const geo of [g.surface, g.curb]) {
      for (let i = 0; i < geo.normals.length; i += 3) {
        expect(Math.hypot(geo.normals[i]!, geo.normals[i + 1]!, geo.normals[i + 2]!)).toBeCloseTo(1, 5);
      }
    }
  });
  it('ROAD-1: la cara interior del cordón mira hacia la calzada', () => {
    const g = buildRoadGeometry(road, flat);
    // Calle a lo largo de +X; normal izquierda = +Z... el cordón en z=+3 (o −3) debe mirar al centro (z=0).
    for (let i = 0; i < g.curb.positions.length; i += 3) {
      const z = g.curb.positions[i + 2]!;
      const nz = g.curb.normals[i + 2]!;
      if (Math.abs(Math.abs(z) - 3) < 1e-6 && Math.abs(nz) > 0.5) expect(Math.sign(nz)).toBe(-Math.sign(z));
    }
  });
  it('ROAD-1: no se generan cordones dentro de otra calle (cruces)', () => {
    const all = buildRoadGeometry(road, flat);
    const covered = buildRoadGeometry(road, flat, (x) => x > 10 && x < 20);
    expect(covered.curb.indices.length).toBeLessThan(all.curb.indices.length);
    expect(covered.surface.indices.length).toBe(all.surface.indices.length);
  });
  it('ROAD-1: las calles quedan por encima de los senderos', () => {
    const r = buildRoadGeometry(road, flat).surface.positions[1]!;
    const p = buildRoadGeometry({ ...road, class: 'path', highway: 'footway', width: 2 }, flat).surface.positions[1]!;
    expect(r).toBeGreaterThan(p);
  });
  it('sigue el terreno', () => {
    const slope = { heightAt: (x: number) => x * 0.1 };
    const g = buildRoadGeometry(road, slope);
    const ys: number[] = [];
    for (let i = 1; i < g.surface.positions.length; i += 3) ys.push(g.surface.positions[i]!);
    expect(Math.max(...ys)).toBeGreaterThan(2.9);
  });
});
