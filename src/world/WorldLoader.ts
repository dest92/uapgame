import { validateWorld } from '@shared/world/validate';
import type { WorldData } from '@shared/world/types';

/** Descarga y valida world.json reportando progreso (PERF-3, WLD-11). */
export async function loadWorld(url: string, onProgress: (p: number) => void): Promise<WorldData> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar world.json (${res.status})`);
  const total = Number(res.headers.get('content-length')) || 0;
  if (!res.body || !total) {
    onProgress(1);
    return validateWorld(await res.json());
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(Math.min(1, received / total));
  }
  const text = new TextDecoder().decode(await new Blob(chunks as BlobPart[]).arrayBuffer());
  return validateWorld(JSON.parse(text));
}
