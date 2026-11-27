/**
 * Genera los hero assets (modelos detallados de edificios, spec 011) a partir del footprint de OSM
 * y de las referencias fotográficas → public/models/hero/<way-id>.glb
 *   npm run data:hero                 (todos)
 *   npm run data:hero -- way/388500961 (uno)
 */
import { mkdirSync, readFileSync } from 'node:fs';
import type { BuildingData, WorldData } from '@shared/world/types';
import type { HeroModel } from './hero/buildings/types';
import { buildBiblioteca } from './hero/buildings/biblioteca';
import { buildEdificioCap } from './hero/buildings/edificio-cap';
import { buildOgden } from './hero/buildings/ogden';
import { buildPioneros } from './hero/buildings/pioneros';
import { buildPortico } from './hero/buildings/portico';
import { buildTemplo } from './hero/buildings/templo';
import { writeHeroGlb } from './hero/lib/glb';

type Generator = (b: BuildingData, world: WorldData) => Promise<HeroModel<string>>;

const GENERATORS: Readonly<Record<string, Generator>> = {
  'way/388500961': buildTemplo,
  'way/388521996': buildPortico,
  'relation/16816367': buildEdificioCap,
  'way/388495172': buildBiblioteca,
  'way/388510375': buildOgden,
  'way/388512621': buildPioneros,
};

async function main(): Promise<void> {
  const world = JSON.parse(readFileSync('data/world.json', 'utf8')) as WorldData;
  const only = process.argv.slice(2);
  mkdirSync('public/models/hero', { recursive: true });
  for (const [id, gen] of Object.entries(GENERATORS)) {
    if (only.length && !only.includes(id)) continue;
    const b = world.buildings.find((x) => x.id === id);
    if (!b) throw new Error(`${id} no está en world.json`);
    const model = await gen(b, world);
    const merged = model.builder.merged((m) => model.materials[m]?.uvScale ?? 1);
    const out = `public/models/hero/${id.replace('/', '-')}.glb`;
    const r = await writeHeroGlb(out, b.name, merged, model.materials);
    console.log(`✓ ${out} — ${b.name}: ${r.triangles.toLocaleString()} tris, ${(r.bytes / 1024).toFixed(0)} KB, ${merged.size} materiales`);
  }
}

main().catch((e: unknown) => {
  console.error('✗', e instanceof Error ? e.stack : e);
  process.exit(1);
});
