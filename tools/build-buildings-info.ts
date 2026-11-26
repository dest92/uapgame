/**
 * Genera/actualiza data/buildings-info.json (spec 007, INT-4/5) desde OSM + referencias.
 *   npm run data:build-info
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { FeatureCollection } from 'geojson';
import type { WorldData } from '../shared/world/types';
import { generateBuildingInfo, mergeBuildingInfo, type BuildingInfoFile } from './lib/info/buildingInfo';
import { loadReferences } from './lib/refs/loadReferences';

const OUT = 'data/buildings-info.json';
const world = JSON.parse(readFileSync('data/world.json', 'utf8')) as WorldData;
const geo = JSON.parse(readFileSync('data/osm/campus.geojson', 'utf8')) as FeatureCollection;
const tags = new Map(geo.features.map((f) => [String(f.id), ((f.properties ?? {}) as { tags?: Record<string, string> }).tags ?? {}]));
const { files } = loadReferences();
const generated = generateBuildingInfo(world, tags, files, new Date().toISOString());
const existing = existsSync(OUT) ? (JSON.parse(readFileSync(OUT, 'utf8')) as BuildingInfoFile) : null;
const merged = mergeBuildingInfo(existing, generated);
writeFileSync(OUT, JSON.stringify(merged, null, 2) + '\n');
console.log(`✓ ${OUT}: ${Object.keys(merged.buildings).length} edificios`);
