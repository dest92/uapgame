/**
 * Descarga los datos OSM del campus de la UAP (spec 002).
 *   npm run data:fetch-osm [-- --name "Universidad Adventista del Plata" --margin 100]
 * Salida: data/osm/campus.geojson, data/osm/campus.json, data/osm/meta.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import osmtogeojson from 'osmtogeojson';
import { DEFAULT_SOURCES } from './lib/osm/defaults';
import { expandGeoBBox, geoBBoxOf } from './lib/osm/bbox';
import { locateCampusByName } from './lib/osm/locator';
import { fetchWithFallback } from './lib/osm/sources';

const { values } = parseArgs({
  options: {
    name: { type: 'string', default: 'Universidad Adventista del Plata' },
    margin: { type: 'string', default: '100' },
    out: { type: 'string', default: 'data/osm' },
  },
});

async function main(): Promise<void> {
  console.log(`→ Buscando el campus por nombre: "${values.name}"`);
  const campus = await locateCampusByName(values.name!);
  console.log(`  ✓ ${campus.name} (${campus.id}), ${campus.outline.length} vértices`);

  const bbox = expandGeoBBox(geoBBoxOf(campus.outline), Number(values.margin));
  console.log(`→ Descargando bbox ${JSON.stringify(bbox)}`);
  const result = await fetchWithFallback(DEFAULT_SOURCES, bbox);
  for (const a of result.attempts) console.warn(`  ⚠ ${a.source} falló: ${a.error}`);
  console.log(`  ✓ ${result.data.elements.length} elementos desde ${result.source}`);

  const geojson = osmtogeojson(result.data as Parameters<typeof osmtogeojson>[0], { flatProperties: false });
  mkdirSync(values.out!, { recursive: true });
  writeFileSync(join(values.out!, 'campus.geojson'), JSON.stringify(geojson));
  writeFileSync(join(values.out!, 'campus.json'), JSON.stringify(campus, null, 2));
  writeFileSync(join(values.out!, 'meta.json'), JSON.stringify({
    fetchedAt: new Date().toISOString(),
    source: result.source,
    failedAttempts: result.attempts,
    campusId: campus.id,
    bbox,
    marginMeters: Number(values.margin),
    features: geojson.features.length,
    attribution: '© OpenStreetMap contributors — ODbL 1.0 (https://www.openstreetmap.org/copyright)',
  }, null, 2));
  console.log(`✓ ${geojson.features.length} features → ${values.out}/campus.geojson`);
}

main().catch((err: unknown) => {
  console.error('✗', err instanceof Error ? err.message : err);
  process.exit(1);
});
