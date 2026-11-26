export type MissingIssue = 'sin-nombre' | 'sin-referencias' | 'altura-estimada' | 'terreno-plano';

export interface MissingInfo {
  readonly id: string;
  readonly name: string;
  readonly issue: MissingIssue;
  readonly detail: string;
}

const TITLES: Readonly<Record<MissingIssue, string>> = {
  'sin-nombre': 'Edificios sin nombre en OSM',
  'sin-referencias': 'Edificios sin referencias fotográficas (materiales genéricos)',
  'altura-estimada': 'Alturas estimadas (sin `height`/`building:levels` ni referencia)',
  'terreno-plano': 'Terreno',
};

/** Genera data/missing-info.md agrupado por tipo de faltante (REF-5, WLD-5). */
export function renderMissingInfo(items: readonly MissingInfo[], generatedAt: string): string {
  const lines = [
    '# Información faltante',
    '',
    `Generado por \`tools/build-world.ts\` el ${generatedAt}. Completar en OSM, en \`reference/\` o en \`data/buildings-info.json\`.`,
    '',
  ];
  for (const issue of Object.keys(TITLES) as MissingIssue[]) {
    const group = items.filter((i) => i.issue === issue);
    if (!group.length) continue;
    lines.push(`## ${TITLES[issue]} (${group.length})`, '');
    for (const i of group) lines.push(`- \`${i.id}\` — ${i.name}: ${i.detail}`);
    lines.push('');
  }
  return lines.join('\n');
}
