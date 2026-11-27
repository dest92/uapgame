/**
 * Fachadas con foto real: recorta la fachada de cada foto listada en
 * data/facade-photos.json y la guarda como WebP en public/textures/facades/<osmKey>.webp.
 * Decisión del cliente: se usan fotos de los sitios institucionales de la UAP (ver CREDITS.md).
 *   npm run data:facades
 */
import { mkdirSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { isForbiddenSource } from './lib/refs/policy';

interface FacadePhoto { building: string; image: string; crop: [number, number, number, number]; imageUrl: string }

/**
 * Recorta el cielo (azul/blanquecino, saturado hacia el azul) en la mitad superior para que la
 * silueta del edificio no quede como un rectángulo con cielo pegado.
 */
export function keyOutSky(rgba: Uint8Array | Buffer, width: number, height: number): void {
  for (let yy = 0; yy < height * 0.7; yy++) {
    for (let xx = 0; xx < width; xx++) {
      const i = (yy * width + xx) * 4;
      const r = rgba[i]!;
      const g = rgba[i + 1]!;
      const b = rgba[i + 2]!;
      const isSky = b > r + 30 && b > g + 8 && b > 110;
      if (isSky) rgba[i + 3] = 0;
    }
  }
}

const list = JSON.parse(readFileSync('data/facade-photos.json', 'utf8')) as FacadePhoto[];
mkdirSync('public/textures/facades', { recursive: true });
for (const f of list) {
  if (isForbiddenSource(f.imageUrl)) throw new Error(`Fuente prohibida (Google Maps/Earth): ${f.imageUrl}`);
  const img = sharp(f.image);
  const { width = 1, height = 1 } = await img.metadata();
  const [x, y, w, h] = f.crop;
  const out = `public/textures/facades/${f.building.replace('/', '-')}.webp`;
  const { data, info } = await img
    .extract({ left: Math.round(x * width), top: Math.round(y * height), width: Math.round(w * width), height: Math.round(h * height) })
    .resize(1024, 512, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  keyOutSky(data, info.width, info.height);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 80, alphaQuality: 80 }).toFile(out);
  console.log(`✓ ${out}`);
}
