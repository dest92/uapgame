import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReferenceSummary } from '../../../shared/world/reference';
import { isForbiddenSource, type RefsFile } from './policy';

export interface LoadedReferences {
  readonly summaries: Map<string, ReferenceSummary>;
  readonly files: Map<string, RefsFile>;
}

/**
 * Lee reference/web/<carpeta>/refs.json. Solo se usan los `summary` de archivos
 * cuyas refs no contengan fuentes prohibidas (REF-2) y que tengan ≥ 1 referencia.
 */
export function loadReferences(dir = 'reference/web'): LoadedReferences {
  const summaries = new Map<string, ReferenceSummary>();
  const files = new Map<string, RefsFile>();
  if (!existsSync(dir)) return { summaries, files };
  for (const folder of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, folder.name, 'refs.json');
    if (!folder.isDirectory() || !existsSync(path)) continue;
    const file = JSON.parse(readFileSync(path, 'utf8')) as RefsFile;
    if (!file.osmId) continue;
    files.set(file.osmId, file);
    const refs = file.refs ?? [];
    const clean = refs.every((r) => !isForbiddenSource(r.imageUrl ?? '') && !isForbiddenSource(r.sourcePageUrl ?? ''));
    if (clean && refs.length > 0 && file.summary) summaries.set(file.osmId, file.summary as ReferenceSummary);
  }
  return { summaries, files };
}
