/**
 * Auditoría de referencias fotográficas (spec 012).
 *
 * La recolección es un proceso manual/asistido (ver reference/web/README.md):
 * búsqueda web + Wikimedia Commons + uap.edu.ar, descartando todo lo derivado de
 * Google Maps / Street View / Earth. Este script NO descarga: valida y reporta.
 *   npm run data:collect-refs
 * - REF-1: cada refs.json tiene URL de imagen, página de origen y fecha.
 * - REF-2: ninguna URL proviene de fuentes prohibidas.
 * - REF-3: no hay imágenes de referencia dentro de public/ ni dist/.
 * - REF-5: lista los edificios de world.json sin referencias.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadReferences } from './lib/refs/loadReferences';
import { validateRefsFile } from './lib/refs/policy';

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const { files, summaries } = loadReferences();
let problems = 0;
for (const [id, file] of files) {
  for (const p of validateRefsFile(file)) {
    problems++;
    console.error(`✗ ${id}: ${p}`);
  }
}

const refImages = walk('reference/web').filter((f) => /\.(jpe?g|png|webp|gif|avif)$/i.test(f));
const leaked = [...walk('public'), ...walk('dist')].filter((f) => f.includes('reference') || f.includes('/web/'));
for (const f of leaked) {
  problems++;
  console.error(`✗ REF-3: posible imagen de referencia en el build: ${f}`);
}

const world = existsSync('data/world.json')
  ? (JSON.parse(readFileSync('data/world.json', 'utf8')) as { buildings: { id: string; name: string; identified: boolean }[] })
  : { buildings: [] };
const covered = world.buildings.filter((b) => summaries.has(b.id));
console.log(`Referencias: ${files.size} carpetas, ${summaries.size} con resumen utilizable, ${refImages.length} imágenes locales (no versionadas).`);
console.log(`Edificios con referencia directa: ${covered.length}/${world.buildings.length}`);
console.log(`Edificios con nombre sin referencia: ${world.buildings.filter((b) => b.identified && !summaries.has(b.id)).map((b) => b.name).join(', ')}`);
if (problems) {
  console.error(`✗ ${problems} problemas`);
  process.exit(1);
}
console.log('✓ Política de referencias OK');
