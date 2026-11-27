/**
 * Hornea las texturas por texel de tools/hero/lib/proctex.ts (las mismas de los hero assets) a sets
 * PBR KTX2 para los muros de los edificios procedurales: public/textures/proc{brick,plaster}/.
 *   npx tsx tools/build-proc-textures.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { encodeKtx2 } from './lib/assets/ktx2';
import { brickTexture, normalFromHeight, plasterTexture, type ProcTexture } from './hero/lib/proctex';

const SIZE = 512;

const png = (rgb: Uint8Array, size: number): Promise<Buffer> =>
  sharp(Buffer.from(rgb), { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();

/** Rugosidad (canal G) desde la altura: juntas y poros más ásperos. */
function roughFromHeight(t: ProcTexture, base: number, span: number): Uint8Array {
  const out = new Uint8Array(t.size * t.size * 3);
  for (let i = 0; i < t.height.length; i++) {
    const r = Math.round(Math.min(1, Math.max(0, base + (1 - t.height[i]!) * span)) * 255);
    out[i * 3] = r;
    out[i * 3 + 1] = r;
    out[i * 3 + 2] = r;
  }
  return out;
}

async function bake(name: string, t: ProcTexture, normalStrength: number, rough: [number, number]): Promise<void> {
  const dir = `public/textures/${name}`;
  mkdirSync(dir, { recursive: true });
  const maps: [string, Uint8Array, 'color' | 'normal' | 'data'][] = [
    ['color', t.albedo, 'color'],
    ['normal', normalFromHeight(t, normalStrength), 'normal'],
    ['rough', roughFromHeight(t, rough[0], rough[1]), 'data'],
  ];
  for (const [map, rgb, role] of maps) {
    const ktx = await encodeKtx2(new Uint8Array(await png(rgb, t.size)), role, SIZE);
    writeFileSync(`${dir}/${map}.ktx2`, ktx);
    console.log(`  ✓ ${dir}/${map}.ktx2 (${(ktx.byteLength / 1024).toFixed(0)} KB)`);
  }
}

async function main(): Promise<void> {
  await bake('procbrick', brickTexture(SIZE, 1), 6, [0.62, 0.35]);
  await bake('procplaster', plasterTexture(SIZE, 7), 2, [0.8, 0.15]);
}

main().catch((e: unknown) => {
  console.error('✗', e instanceof Error ? e.stack : e);
  process.exit(1);
});
