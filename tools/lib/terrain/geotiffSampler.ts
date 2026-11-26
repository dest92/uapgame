import { fromArrayBuffer } from 'geotiff';
import { readFileSync } from 'node:fs';

/** Muestreador bilineal (lon, lat) → elevación sobre un GeoTIFF en EPSG:4326. */
export async function loadGeoTiffSampler(path: string): Promise<(lon: number, lat: number) => number> {
  const buf = readFileSync(path);
  const tiff = await fromArrayBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const image = await tiff.getImage();
  const [west, south, east, north] = image.getBoundingBox() as [number, number, number, number];
  const w = image.getWidth();
  const h = image.getHeight();
  const data = (await image.readRasters({ interleave: true })) as unknown as ArrayLike<number>;
  const px = (c: number, r: number): number =>
    data[Math.min(h - 1, Math.max(0, r)) * w + Math.min(w - 1, Math.max(0, c))] ?? 0;
  return (lon, lat) => {
    // Centros de píxel: la grilla cubre [west,east] con w píxeles.
    const gx = ((lon - west) / (east - west)) * w - 0.5;
    const gy = ((north - lat) / (north - south)) * h - 0.5;
    const c = Math.floor(gx);
    const r = Math.floor(gy);
    const tx = gx - c;
    const ty = gy - r;
    return (px(c, r) * (1 - tx) + px(c + 1, r) * tx) * (1 - ty) + (px(c, r + 1) * (1 - tx) + px(c + 1, r + 1) * tx) * ty;
  };
}
