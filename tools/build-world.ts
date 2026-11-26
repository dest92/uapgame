/**
 * Genera data/world.json y data/missing-info.md desde los datos OSM descargados (spec 003).
 *   npm run data:build-world
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureCollection } from 'geojson';
import { createEnuProjection } from '../shared/geo/enu';
import { validateWorld } from '../shared/world/validate';
import { buildWorld } from './lib/world/buildWorld';
import { renderMissingInfo } from './lib/world/missingInfo';
import { loadReferences } from './lib/refs/loadReferences';
import { loadGeoTiffSampler } from './lib/terrain/geotiffSampler';
import { resampleTerrain } from './lib/terrain/resample';

const TERRAIN_DIR = 'reference/terrain';
const TERRAIN_CELL = 10;
const TERRAIN_SIGMA_CELLS = 2;

async function main(): Promise<void> {
  const geojson = JSON.parse(readFileSync('data/osm/campus.geojson', 'utf8')) as FeatureCollection;
  const campus = JSON.parse(readFileSync('data/osm/campus.json', 'utf8'));
  const meta = JSON.parse(readFileSync('data/osm/meta.json', 'utf8')) as { marginMeters: number };
  const refs = loadReferences();
  const generatedAt = new Date().toISOString();
  console.log(`→ ${geojson.features.length} features, ${refs.summaries.size} edificios con referencias`);

  // Primera pasada sin terreno para conocer origen y bounds.
  const draft = buildWorld({ geojson, campus, marginMeters: meta.marginMeters, references: refs.summaries, generatedAt });
  const tif = existsSync(TERRAIN_DIR) ? readdirSync(TERRAIN_DIR).find((f) => /\.tiff?$/i.test(f)) : undefined;
  let terrain;
  if (tif) {
    const sampler = await loadGeoTiffSampler(join(TERRAIN_DIR, tif));
    terrain = resampleTerrain({
      bounds: draft.world.bounds, cellSize: TERRAIN_CELL, proj: createEnuProjection(draft.world.origin),
      sampleGeo: sampler, sigmaCells: TERRAIN_SIGMA_CELLS,
      source: `${tif} (IGN MDT 30 m), remuestreado a ${TERRAIN_CELL} m y suavizado σ=${TERRAIN_SIGMA_CELLS * TERRAIN_CELL} m`,
    });
    console.log(`  ✓ terreno desde ${tif}`);
  } else {
    console.warn('  ⚠ TODO: no hay GeoTIFF en reference/terrain/ → terreno plano con ondulación procedural');
  }

  const { world, missing } = buildWorld({
    geojson, campus, marginMeters: meta.marginMeters, references: refs.summaries, generatedAt,
    ...(terrain ? { terrain } : {}),
  });
  validateWorld(JSON.parse(JSON.stringify(world)));
  writeFileSync('data/world.json', JSON.stringify(world));
  writeFileSync('data/missing-info.md', renderMissingInfo(missing, generatedAt));
  const kb = (Buffer.byteLength(JSON.stringify(world)) / 1024).toFixed(0);
  console.log(`✓ data/world.json (${kb} KB): ${world.buildings.length} edificios, ${world.roads.length} caminos, ` +
    `${world.areas.length} áreas, ${world.trees.length} árboles, ${world.pois.length} POIs`);
  console.log(`✓ data/missing-info.md (${missing.length} entradas)`);
}

main().catch((e: unknown) => {
  console.error('✗', e instanceof Error ? e.stack : e);
  process.exit(1);
});
