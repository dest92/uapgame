/**
 * PERF-2: verifica que la carga inicial del build (`dist/`) sea < 15 MB.
 * Suma todo lo que el juego descarga al iniciar (JS, CSS, datos, texturas, personaje,
 * transcoder Basis). Excluye decoders que solo se piden si hay hero assets Draco.
 *   npm run build && npm run check:size
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET = 15 * 1024 * 1024;
const EXCLUDE = [/draco/i, /models\/hero\//, /\.map$/, /basis_transcoder\.js$/];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk('dist').filter((f) => !EXCLUDE.some((re) => re.test(f)));
let raw = 0;
let gz = 0;
const rows = files.map((f) => {
  const buf = readFileSync(f);
  const g = /\.(js|css|json|html|wasm|svg)$/.test(f) ? gzipSync(buf).length : buf.length;
  raw += buf.length;
  gz += g;
  return { f: relative('dist', f), raw: buf.length, gz: g };
});
rows.sort((a, b) => b.raw - a.raw).slice(0, 12).forEach((r) => console.log(`${(r.raw / 1024).toFixed(0).padStart(7)} KB  (gzip ${(r.gz / 1024).toFixed(0).padStart(6)} KB)  ${r.f}`));
const mb = (n: number): string => (n / 1024 / 1024).toFixed(2);
console.log(`Total: ${mb(raw)} MB sin comprimir · ${mb(gz)} MB transferidos con gzip · presupuesto ${mb(BUDGET)} MB`);
if (raw > BUDGET) {
  console.error('✗ PERF-2: la carga inicial supera el presupuesto');
  process.exit(1);
}
console.log('✓ PERF-2 OK');
