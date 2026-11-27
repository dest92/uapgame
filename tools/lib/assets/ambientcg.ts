import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchWithTimeout } from '../http';

export const AMBIENTCG_CACHE = '.cache/ambientcg';

/** Descarga y descomprime un set 1K-JPG de ambientCG (CC0) en la caché; devuelve la carpeta. */
export async function downloadAmbientCg(asset: string): Promise<string> {
  const dir = join(AMBIENTCG_CACHE, asset);
  if (existsSync(dir)) return dir;
  mkdirSync(dir, { recursive: true });
  const zip = join(AMBIENTCG_CACHE, `${asset}.zip`);
  const res = await fetchWithTimeout(`https://ambientcg.com/get?file=${asset}_1K-JPG.zip`, {}, 120_000);
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  execFileSync('unzip', ['-q', '-o', zip, '-d', dir]);
  return dir;
}
