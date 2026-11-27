/**
 * Descarga modelos CC0 de Poly Haven (glTF 1k + texturas) a .cache/polyhaven/<id>/.
 *   npm run assets:polyhaven -- jacaranda_tree island_tree_02 ...
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fetchWithTimeout } from './lib/http';

interface FileEntry { url: string; size: number }
interface GltfFiles { gltf: Record<string, { gltf: FileEntry & { include: Record<string, FileEntry> } }>; [map: string]: unknown }
type MapFiles = Record<string, Record<string, FileEntry>>;

export const DEFAULT_MODELS = ['jacaranda_tree', 'island_tree_02', 'shrub_03', 'shrub_04', 'painted_wooden_bench'];

async function download(url: string, path: string): Promise<void> {
  if (existsSync(path)) return;
  mkdirSync(dirname(path), { recursive: true });
  const res = await fetchWithTimeout(url, {}, 600_000);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
}

async function main(): Promise<void> {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_MODELS;
  for (const id of ids) {
    const files = (await (await fetchWithTimeout(`https://api.polyhaven.com/files/${id}`)).json()) as GltfFiles;
    const res = files.gltf['1k'] ?? Object.values(files.gltf)[0];
    if (!res) throw new Error(`${id}: sin glTF`);
    const dir = join('.cache/polyhaven', id);
    await download(res.gltf.url, join(dir, `${id}.gltf`));
    for (const [rel, f] of Object.entries(res.gltf.include)) await download(f.url, join(dir, rel));
    // El glTF trae el difuso en JPG (sin alfa): bajamos aparte los mapas *alpha para las hojas.
    for (const [key, value] of Object.entries(files)) {
      if (!/alpha$/i.test(key)) continue;
      const res = value as MapFiles;
      const best = res['1k'] ?? res['2k'] ?? Object.values(res)[0];
      const jpg = best?.['jpg'];
      if (jpg) await download(jpg.url, join(dir, 'textures', jpg.url.split('/').pop()!));
    }
    const mb = (Object.values(res.gltf.include).reduce((a, f) => a + f.size, 0) / 1e6).toFixed(1);
    console.log(`✓ ${id} (${mb} MB) → ${dir}`);
  }
}

main().catch((e: unknown) => {
  console.error('✗', e instanceof Error ? e.message : e);
  process.exit(1);
});
