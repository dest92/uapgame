import type { WorldData } from '@shared/world/types';

/** Mundo mínimo válido para tests. */
export function makeWorld(): WorldData {
  return {
    version: 1,
    generatedAt: '2026-11-26T00:00:00Z',
    attribution: '© OpenStreetMap contributors',
    origin: { lon: -60.4672, lat: -32.0734 },
    bounds: { minX: -100, minZ: -100, maxX: 100, maxZ: 100 },
    campus: { id: 'way/1', name: 'Campus', outline: [{ x: -50, z: -50 }, { x: 50, z: -50 }, { x: 50, z: 50 }] },
    terrain: { kind: 'flat', source: 'test' },
    buildings: [
      {
        id: 'way/10', name: 'Biblioteca', identified: true, kind: 'yes',
        footprint: [{ x: 0, z: 0 }, { x: 0, z: 10 }, { x: 20, z: 10 }, { x: 20, z: 0 }],
        centroid: { x: 10, z: 5 }, height: 6.4, minHeight: 0, levels: 2, heightSource: 'default',
        roof: { shape: 'flat', height: 0 },
        appearance: { wallMaterial: 'brick', wallColor: '#a0522d', roofColor: '#666666', trimColor: '#eeeeee', source: 'generic' },
        entrance: { position: { x: 10, z: 10.5 }, normal: { x: 0, z: 1 } },
        poiIds: [],
      },
    ],
    roads: [{ id: 'way/20', class: 'path', highway: 'footway', width: 2.2, surface: 'paved', points: [{ x: -5, z: 14 }, { x: 25, z: 14 }] }],
    areas: [{ id: 'way/30', kind: 'park', polygon: [{ x: 30, z: 30 }, { x: 60, z: 30 }, { x: 60, z: 60 }] }],
    trees: [{ id: 'node/40', position: { x: 40, z: 40 }, species: 'broadleaf' }],
    pois: [],
  };
}
