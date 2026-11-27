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

const list = JSON.parse(readFileSync('data/facade-photos.json', 'utf8')) as FacadePhoto[];
mkdirSync('public/textures/facades', { recursive: true });
for (const f of list) {
  if (isForbiddenSource(f.imageUrl)) throw new Error(`Fuente prohibida (Google Maps/Earth): ${f.imageUrl}`);
  const img = sharp(f.image);
  const { width = 1, height = 1 } = await img.metadata();
  const [x, y, w, h] = f.crop;
  const out = `public/textures/facades/${f.building.replace('/', '-')}.webp`;
  await img.extract({ left: Math.round(x * width), top: Math.round(y * height), width: Math.round(w * width), height: Math.round(h * height) })
    .resize(1024, 512, { fit: 'fill' }).webp({ quality: 80 }).toFile(out);
  console.log(`✓ ${out}`);
}
