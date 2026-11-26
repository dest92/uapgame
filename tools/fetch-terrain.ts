/**
 * Descarga elevación del IGN (Instituto Geográfico Nacional, Argentina) para el bbox
 * del campus y la guarda como GeoTIFF Float32 en reference/terrain/.
 *
 * El GeoServer del IGN tiene WCS deshabilitado y prohíbe estilos dinámicos, así que
 * se muestrea el valor crudo (GRAY_INDEX, metros) con WMS GetFeatureInfo sobre una
 * grilla regular. Capa: mosaico_alos_30:mdt_argentina_alos_30m (MDT 30 m del IGN).
 *   npm run data:fetch-terrain [-- --step 35]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { writeArrayBuffer } from 'geotiff';
import { fetchWithTimeout } from './lib/http';
import { createEnuProjection } from '../shared/geo/enu';
import type { GeoBBox } from '../shared/geo/types';

const LAYER = 'mosaico_alos_30:mdt_argentina_alos_30m';
const ENDPOINT = 'https://imagenes.ign.gob.ar/geoserver/ows';
const { values } = parseArgs({ options: { step: { type: 'string', default: '35' }, concurrency: { type: 'string', default: '4' } } });

async function sample(lon: number, lat: number): Promise<number> {
  const d = 0.0001;
  const params = new URLSearchParams({
    service: 'WMS', version: '1.1.1', request: 'GetFeatureInfo', layers: LAYER, query_layers: LAYER,
    srs: 'EPSG:4326', bbox: `${lon - d},${lat - d},${lon + d},${lat + d}`, width: '3', height: '3', x: '1', y: '1',
    info_format: 'application/json',
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetchWithTimeout(`${ENDPOINT}?${params}`, {}, 30_000);
      const json = (await res.json()) as { features: { properties: { GRAY_INDEX: number } }[] };
      const v = json.features[0]?.properties.GRAY_INDEX;
      if (typeof v === 'number') return v;
    } catch { /* reintento */ }
  }
  throw new Error(`Sin dato de elevación en ${lon},${lat}`);
}

async function main(): Promise<void> {
  const meta = JSON.parse(readFileSync('data/osm/meta.json', 'utf8')) as { bbox: GeoBBox };
  const bb = meta.bbox;
  const proj = createEnuProjection({ lon: (bb.west + bb.east) / 2, lat: (bb.south + bb.north) / 2 });
  const step = Number(values.step);
  const sw = proj.toLocal({ lon: bb.west, lat: bb.south });
  const ne = proj.toLocal({ lon: bb.east, lat: bb.north });
  const cols = Math.ceil((ne.x - sw.x) / step) + 1;
  const rows = Math.ceil((sw.z - ne.z) / step) + 1;
  const dLon = (bb.east - bb.west) / (cols - 1);
  const dLat = (bb.north - bb.south) / (rows - 1);
  console.log(`→ Muestreando ${cols}×${rows} = ${cols * rows} puntos (paso ${step} m) de ${LAYER}`);

  const heights = new Float32Array(cols * rows);
  const jobs = Array.from({ length: cols * rows }, (_, i) => i);
  let done = 0;
  const worker = async (): Promise<void> => {
    for (let i = jobs.shift(); i !== undefined; i = jobs.shift()) {
      const c = i % cols;
      const r = Math.floor(i / cols); // fila 0 = norte (convención GeoTIFF)
      heights[i] = await sample(bb.west + c * dLon, bb.north - r * dLat);
      if (++done % 100 === 0) console.log(`  ${done}/${cols * rows}`);
    }
  };
  await Promise.all(Array.from({ length: Number(values.concurrency) }, worker));

  const tiff = await writeArrayBuffer(heights, {
    width: cols, height: rows,
    ModelPixelScale: [dLon, dLat, 0],
    ModelTiepoint: [0, 0, 0, bb.west - dLon / 2, bb.north + dLat / 2, 0],
    GeographicTypeGeoKey: 4326, GTModelTypeGeoKey: 2, GTRasterTypeGeoKey: 1,
    SampleFormat: [3], BitsPerSample: [32],
  });
  mkdirSync('reference/terrain', { recursive: true });
  writeFileSync('reference/terrain/ign-mdt30-campus.tif', Buffer.from(tiff as ArrayBuffer));
  writeFileSync('reference/terrain/ign-mdt30-campus.json', JSON.stringify({
    source: `IGN Argentina — ${LAYER} vía WMS GetFeatureInfo (${ENDPOINT})`,
    license: 'Datos abiertos del IGN — citar "Instituto Geográfico Nacional de la República Argentina"',
    fetchedAt: new Date().toISOString(), bbox: bb, cols, rows, stepMeters: step,
    min: Math.min(...heights), max: Math.max(...heights),
  }, null, 2));
  console.log(`✓ reference/terrain/ign-mdt30-campus.tif (${Math.min(...heights)}–${Math.max(...heights)} m)`);
}

main().catch((e: unknown) => {
  console.error('✗', e instanceof Error ? e.message : e);
  process.exit(1);
});
