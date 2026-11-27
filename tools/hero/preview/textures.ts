/**
 * Vuelca las texturas procedurales de los hero assets a PNG para revisarlas.
 *   npx tsx tools/hero/preview/textures.ts <carpeta>
 */
import sharp from 'sharp';
import { PROC_TEXTURES, normalFromHeight } from '../lib/proctex';

async function main(): Promise<void> {
  const out = process.argv[2] ?? '.';
  for (const [name, gen] of Object.entries(PROC_TEXTURES)) {
    const t = gen(512);
    const raw = { raw: { width: t.size, height: t.size, channels: 3 as const } };
    await sharp(Buffer.from(t.albedo), raw).png().toFile(`${out}/tex-${name}.png`);
    await sharp(Buffer.from(normalFromHeight(t)), raw).png().toFile(`${out}/tex-${name}-n.png`);
    console.log(`✓ ${name}`);
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
