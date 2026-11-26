import { describe, it, expect } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { buildWorld } from '../../../tools/lib/world/buildWorld';
import { validateWorld } from '@shared/world/validate';
import { polygonArea, signedArea } from '@shared/geo/polygon';

// Mini-campus alrededor de (-60.4672, -32.0734). 0.0001° ≈ 9.4 m (lon), 11.1 m (lat).
const O = { lon: -60.4672, lat: -32.0734 };
const sq = (lon: number, lat: number, d: number): number[][] => [
  [lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d], [lon, lat],
];
const fc: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', id: 'way/1', properties: { type: 'way', id: 1, tags: { building: 'yes', name: 'Biblioteca I. Mohr', 'building:levels': '2' } },
      geometry: { type: 'Polygon', coordinates: [sq(O.lon, O.lat, 0.0003)] } },
    { type: 'Feature', id: 'way/2', properties: { type: 'way', id: 2, tags: { building: 'yes' } },
      geometry: { type: 'Polygon', coordinates: [sq(O.lon + 0.001, O.lat, 0.0002)] } },
    { type: 'Feature', id: 'way/3', properties: { type: 'way', id: 3, tags: { highway: 'footway' } },
      geometry: { type: 'LineString', coordinates: [[O.lon - 0.001, O.lat - 0.0001], [O.lon + 0.002, O.lat - 0.0001]] } },
    { type: 'Feature', id: 'way/4', properties: { type: 'way', id: 4, tags: { leisure: 'park', name: 'Plaza' } },
      geometry: { type: 'Polygon', coordinates: [sq(O.lon - 0.001, O.lat + 0.0005, 0.0004)] } },
    { type: 'Feature', id: 'node/5', properties: { type: 'node', id: 5, tags: { natural: 'tree', leaf_type: 'needleleaved' } },
      geometry: { type: 'Point', coordinates: [O.lon - 0.0008, O.lat + 0.0006] } },
    { type: 'Feature', id: 'node/6', properties: { type: 'node', id: 6, tags: { name: 'Rectoría', office: 'yes' } },
      geometry: { type: 'Point', coordinates: [O.lon + 0.0011, O.lat + 0.0001] } },
    { type: 'Feature', id: 'way/7', properties: { type: 'way', id: 7, tags: { building: 'yes' } },
      geometry: { type: 'Polygon', coordinates: [sq(O.lon + 0.05, O.lat, 0.0002)] } }, // fuera del bbox
    { type: 'Feature', id: 'way/8', properties: { type: 'way', id: 8, tags: { building: 'shed' } },
      geometry: { type: 'Polygon', coordinates: [sq(O.lon + 0.0005, O.lat + 0.0005, 0.00001)] } }, // < 4 m²
  ],
};
const campus = {
  id: 'way/100', name: 'Universidad Adventista del Plata',
  outline: [{ lon: O.lon - 0.0015, lat: O.lat - 0.0005 }, { lon: O.lon + 0.0015, lat: O.lat - 0.0005 },
    { lon: O.lon + 0.0015, lat: O.lat + 0.001 }, { lon: O.lon - 0.0015, lat: O.lat + 0.001 }],
};

describe('buildWorld (spec 003)', () => {
  const { world, missing } = buildWorld({
    geojson: fc, campus, marginMeters: 100,
    references: new Map<string, import('@shared/world/reference').ReferenceSummary>([
      ['node/6', { wallMaterial: 'glass', wallColor: '#3c4651' }],['way/2', { levels: 3, roof: 'gable', wallMaterial: 'brick', wallColor: '#8a4b33', roofColor: '#7a2e1f' }]]),
    generatedAt: '2026-11-26T00:00:00Z',
  });

  it('WLD-11: la salida pasa la validación', () => {
    expect(() => validateWorld(JSON.parse(JSON.stringify(world)))).not.toThrow();
  });
  it('WLD-1: origen en el centroide del campus', () => {
    expect(world.origin.lon).toBeCloseTo(O.lon, 4);
    expect(world.origin.lat).toBeCloseTo(O.lat + 0.00025, 4);
  });
  it('WLD-2: footprint CCW sin punto de cierre', () => {
    const b = world.buildings.find((x) => x.id === 'way/1')!;
    expect(b.footprint).toHaveLength(4);
    expect(signedArea(b.footprint)).toBeGreaterThan(0);
    expect(polygonArea(b.footprint)).toBeGreaterThan(500);
  });
  it('WLD-3/4: alturas y techos desde tags y referencias', () => {
    const lib = world.buildings.find((x) => x.id === 'way/1')!;
    expect(lib.levels).toBe(2);
    expect(lib.heightSource).toBe('levels');
    const ref = world.buildings.find((x) => x.id === 'way/2')!;
    expect(ref.levels).toBe(3);
    expect(ref.roof.shape).toBe('gabled');
    expect(ref.appearance).toMatchObject({ wallMaterial: 'brick', wallColor: '#8a4b33', source: 'reference' });
  });
  it('WLD-5: edificio sin nombre queda identificado como tal y se registra; POIs internos se asocian', () => {
    const b = world.buildings.find((x) => x.id === 'way/2')!;
    expect(b.name).toBe('Edificio sin identificar (OSM way 2)');
    expect(b.poiIds).toEqual(['node/6']);
    expect(missing.some((m) => m.id === 'way/2' && m.issue === 'sin-nombre')).toBe(true);
  });
  it('REF-4: una referencia asociada a un POI se aplica al edificio que lo contiene', () => {
    // way/2 tiene su propia referencia; probamos con un edificio que solo contiene el POI.
    const { world: w2 } = buildWorld({
      geojson: fc, campus, marginMeters: 100, generatedAt: 'x',
      references: new Map([['node/6', { wallMaterial: 'glass', wallColor: '#3c4651' }]]),
    });
    expect(w2.buildings.find((x) => x.id === 'way/2')!.appearance).toMatchObject({ wallMaterial: 'glass', source: 'reference' });
  });
  it('WLD-5: edificio sin referencias registrado en missing-info', () => {
    expect(missing.some((m) => m.id === 'way/1' && m.issue === 'sin-referencias')).toBe(true);
  });
  it('WLD-6: caminos con ancho y superficie', () => {
    expect(world.roads[0]).toMatchObject({ class: 'path', highway: 'footway', surface: 'paved' });
  });
  it('WLD-7/8: áreas y árboles', () => {
    expect(world.areas[0]).toMatchObject({ kind: 'park', name: 'Plaza' });
    expect(world.trees[0]).toMatchObject({ id: 'node/5', species: 'conifer' });
  });
  it('WLD-9: cada edificio tiene entrada', () => {
    for (const b of world.buildings) expect(b.entrance.normal).toBeDefined();
  });
  it('WLD-10: descarta lo que está fuera del bbox y lo degenerado', () => {
    const ids = world.buildings.map((b) => b.id);
    expect(ids).not.toContain('way/7');
    expect(ids).not.toContain('way/8');
  });
  it('POIs con nombre se exportan', () => {
    expect(world.pois.map((p) => p.name)).toContain('Rectoría');
  });
});
