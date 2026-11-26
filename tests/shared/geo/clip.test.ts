import { describe, it, expect } from 'vitest';
import { clipPolylineToBBox, clipPolygonToBBox } from '@shared/geo/clip';

const bb = { minX: 0, minZ: 0, maxX: 10, maxZ: 10 };

describe('clip (WLD-10)', () => {
  it('WLD-10: polilínea que cruza el bbox se recorta en el borde', () => {
    const parts = clipPolylineToBBox([{ x: -5, z: 5 }, { x: 5, z: 5 }], bb);
    expect(parts).toEqual([[{ x: 0, z: 5 }, { x: 5, z: 5 }]]);
  });
  it('WLD-10: polilínea que sale y vuelve se parte en dos', () => {
    const parts = clipPolylineToBBox([{ x: 2, z: 2 }, { x: 2, z: 20 }, { x: 8, z: 20 }, { x: 8, z: 2 }], bb);
    expect(parts).toHaveLength(2);
  });
  it('WLD-10: polilínea totalmente afuera → vacío', () => {
    expect(clipPolylineToBBox([{ x: 20, z: 20 }, { x: 30, z: 30 }], bb)).toEqual([]);
  });
  it('WLD-10: polígono recortado al bbox (Sutherland–Hodgman)', () => {
    const out = clipPolygonToBBox([{ x: -5, z: -5 }, { x: 5, z: -5 }, { x: 5, z: 5 }, { x: -5, z: 5 }], bb);
    const xs = out.map((p) => p.x);
    expect(Math.min(...xs)).toBe(0);
    expect(out.length).toBe(4);
  });
});
