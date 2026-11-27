/**
 * Descarga texturas PBR tileables CC0 de ambientCG, las redimensiona y codifica a
 * KTX2 (Basis ETC1S) en public/textures/<nombre>/{color,normal,rough}.ktx2.
 * Escribe public/textures/manifest.json y la tabla de créditos (CREDITS.md).
 *   npm run data:textures
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMBIENTCG_CACHE as CACHE, downloadAmbientCg } from './lib/assets/ambientcg';
import { encodeKtx2, type TextureRole } from './lib/assets/ktx2';

interface TextureSet {
  readonly name: string;
  readonly asset: string;
  readonly use: string;
  /** Tamaño del color; normal = color/2, rugosidad = color/4. */
  readonly size: number;
}

export const TEXTURE_SETS: readonly TextureSet[] = [
  { name: 'grass', asset: 'Grass004', use: 'césped (terreno)', size: 1024 },
  { name: 'dirt', asset: 'Ground037', use: 'tierra/grava (terreno, pista)', size: 512 },
  { name: 'asphalt', asset: 'Asphalt010', use: 'calles', size: 1024 },
  { name: 'paving', asset: 'PavingStones130', use: 'veredas y senderos', size: 1024 },
  { name: 'concrete', asset: 'Concrete034', use: 'cordones, losas, techos planos', size: 512 },
  { name: 'brick', asset: 'Bricks085', use: 'fachadas de ladrillo', size: 1024 },
  { name: 'plaster', asset: 'PaintedPlaster017', use: 'fachadas revocadas', size: 512 },
  { name: 'rooftiles', asset: 'RoofingTiles006', use: 'techos de tejas', size: 512 },
  { name: 'bark', asset: 'Bark012', use: 'troncos de árboles', size: 512 },
  { name: 'metal', asset: 'Metal032', use: 'faroles, techos metálicos', size: 256 },
];

const OUT = 'public/textures';
const MAPS: readonly [TextureRole, RegExp, string, number][] = [
  ['color', /_Color\.jpg$/, 'color.ktx2', 1],
  ['normal', /_NormalGL\.jpg$/, 'normal.ktx2', 2],
  ['data', /_Roughness\.jpg$/, 'rough.ktx2', 4],
];

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const manifest: Record<string, { asset: string; maps: string[] }> = {};
  let total = 0;
  for (const set of TEXTURE_SETS) {
    const dir = await downloadAmbientCg(set.asset);
    const files = readdirSync(dir);
    mkdirSync(join(OUT, set.name), { recursive: true });
    const maps: string[] = [];
    for (const [role, re, outName, div] of MAPS) {
      const file = files.find((f) => re.test(f));
      if (!file) continue;
      const data = await encodeKtx2(new Uint8Array(readFileSync(join(dir, file))), role, Math.max(128, set.size / div));
      writeFileSync(join(OUT, set.name, outName), data);
      total += data.byteLength;
      maps.push(outName.replace('.ktx2', ''));
    }
    manifest[set.name] = { asset: set.asset, maps };
    console.log(`✓ ${set.name} ← ${set.asset} (${maps.join(', ')})`);
  }
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const rows = TEXTURE_SETS.map((s) => `| ${s.name} | [${s.asset}](https://ambientcg.com/view?id=${s.asset}) | ambientCG | CC0 1.0 | ${s.use} |`);
  writeFileSync(join(CACHE, 'credits-table.md'), ['| Textura | Asset | Autor | Licencia | Uso |', '|---|---|---|---|---|', ...rows].join('\n'));
  console.log(`✓ ${(total / 1024 / 1024).toFixed(2)} MB en ${OUT}`);
}

main().catch((e: unknown) => {
  console.error('✗', e instanceof Error ? e.message : e);
  process.exit(1);
});
