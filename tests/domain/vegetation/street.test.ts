import { describe, it, expect } from 'vitest';
import { streetTreePoints } from '../../../src/domain/vegetation/scatter';
import { lampPositions } from '../../../src/world/props/StreetLamps';
import type { RoadData } from '@shared/world/types';

describe('arbolado de vereda y faroles', () => {
  const corridor = { points: [{ x: 0, z: 0 }, { x: 100, z: 0 }], width: 6 };
  it('árboles a ambos lados, a ancho/2 + retiro, cada `step` m', () => {
    const pts = streetTreePoints([corridor], 10, 2);
    expect(pts.length).toBe(20);
    for (const p of pts) expect(Math.abs(p.z)).toBeCloseTo(5);
  });
  it('faroles solo en calles (no senderos), cada ~32 m, fuera de la calzada', () => {
    const roads: RoadData[] = [
      { id: 'a', class: 'road', highway: 'residential', width: 6, surface: 'asphalt', points: corridor.points },
      { id: 'b', class: 'path', highway: 'footway', width: 2, surface: 'paved', points: corridor.points },
    ];
    const lamps = lampPositions(roads);
    expect(lamps.length).toBe(3);
    for (const l of lamps) expect(Math.abs(l.z)).toBeGreaterThan(3);
  });
});
