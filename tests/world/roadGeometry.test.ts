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
  it('sigue el terreno', () => {
    const slope = { heightAt: (x: number) => x * 0.1 };
    const g = buildRoadGeometry(road, slope);
    const ys: number[] = [];
    for (let i = 1; i < g.surface.positions.length; i += 3) ys.push(g.surface.positions[i]!);
    expect(Math.max(...ys)).toBeGreaterThan(2.9);
  });
});
