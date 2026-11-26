import { describe, it, expect } from 'vitest';
import { fetchWithFallback, type OsmDataSource } from '../../../tools/lib/osm/sources';
import { buildCampusQuery } from '../../../tools/lib/osm/query';
import { expandGeoBBox, geoBBoxOf } from '../../../tools/lib/osm/bbox';
import { DEFAULT_SOURCES } from '../../../tools/lib/osm/defaults';

const bbox = { west: -60.47, south: -32.077, east: -60.46, north: -32.07 };
const ok = (name: string): OsmDataSource => ({ name, fetchBBox: async () => ({ elements: [{ type: 'node', id: 1 }] }) });
const failing = (name: string, msg: string): OsmDataSource => ({ name, fetchBBox: async () => { throw new Error(msg); } });

describe('fetchWithFallback (OSM-3)', () => {
  it('OSM-3: usa la primera fuente que responde', async () => {
    const r = await fetchWithFallback([failing('a', 'timeout'), ok('b'), ok('c')], bbox);
    expect(r.source).toBe('b');
    expect(r.attempts).toEqual([{ source: 'a', error: 'timeout' }]);
  });
  it('OSM-3: si todas fallan, error con el detalle de cada intento', async () => {
    await expect(fetchWithFallback([failing('a', 'x'), failing('b', 'y')], bbox)).rejects.toThrow(/a: x.*b: y/s);
  });
  it('OSM-3: respuesta sin elementos cuenta como fallo', async () => {
    const empty: OsmDataSource = { name: 'e', fetchBBox: async () => ({ elements: [] }) };
    const r = await fetchWithFallback([empty, ok('b')], bbox);
    expect(r.source).toBe('b');
  });
});

describe('buildCampusQuery (OSM-4)', () => {
  const q = buildCampusQuery(bbox);
  it('OSM-4: pide edificios, caminos, áreas, árboles y POIs dentro del bbox', () => {
    for (const f of ['"building"', '"highway"', '"leisure"', '"landuse"', '"natural"="tree"', '"amenity"', '"office"', '"shop"', '"tourism"']) {
      expect(q).toContain(f);
    }
    expect(q).toContain('(-32.077,-60.47,-32.07,-60.46)');
    expect(q).toMatch(/out body;\s*>;\s*out skel qt;/);
  });
});

describe('bbox (OSM-2)', () => {
  it('OSM-2: expande 100 m por lado', () => {
    const bb = geoBBoxOf([{ lon: -60.47, lat: -32.07 }, { lon: -60.46, lat: -32.08 }]);
    const ex = expandGeoBBox(bb, 100);
    expect(bb.north - ex.north).toBeCloseTo(-100 / 110886, 5);
    expect(ex.west).toBeLessThan(bb.west);
    expect((bb.west - ex.west) * 94495).toBeCloseTo(100, 0);
  });
});

describe('fuentes por defecto (OSM-6)', () => {
  it('OSM-6: ninguna fuente es de Google', () => {
    for (const s of DEFAULT_SOURCES) expect(s.name).not.toMatch(/google/i);
    expect(DEFAULT_SOURCES.length).toBeGreaterThanOrEqual(2);
  });
});

import { pickCampus } from '../../../tools/lib/osm/locator';

describe('pickCampus (OSM-1)', () => {
  it('OSM-1: elige la universidad con polígono e ignora otros resultados', () => {
    const c = pickCampus([
      { osm_type: 'node', osm_id: 5, class: 'amenity', type: 'clinic', name: 'Sanatorio' },
      { osm_type: 'way', osm_id: 388521975, category: 'amenity', type: 'university', name: 'UAP',
        geojson: { type: 'Polygon', coordinates: [[[-60.47, -32.07], [-60.46, -32.07], [-60.46, -32.08]]] } },
    ]);
    expect(c.id).toBe('way/388521975');
    expect(c.outline).toHaveLength(3);
  });
  it('OSM-1: falla claramente si no hay universidad', () => {
    expect(() => pickCampus([])).toThrow(/university/);
  });
});
