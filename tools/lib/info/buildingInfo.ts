import type { WorldData } from '../../../shared/world/types';

export interface Sourced {
  readonly value: string | null;
  readonly source: string | null;
}

export interface InfoField {
  readonly label: string;
  readonly value: string;
  /** "OSM way/123", URL de referencia o "manual". */
  readonly source: string;
}

export interface BuildingInfo {
  readonly name: Sourced;
  readonly description: Sourced;
  readonly fields: readonly InfoField[];
  readonly references: readonly string[];
  /** Si es true, el generador no toca esta entrada. */
  readonly manual?: boolean;
}

export interface BuildingInfoFile {
  readonly generatedAt: string;
  readonly note: string;
  readonly buildings: Readonly<Record<string, BuildingInfo>>;
}

export interface RefsLike {
  readonly refs?: readonly { readonly sourcePageUrl?: string }[];
  readonly summary?: { readonly levels?: number | null };
}

const TAG_FIELDS: readonly [string, string][] = [
  ['amenity', 'Tipo'], ['office', 'Oficina'], ['shop', 'Comercio'], ['leisure', 'Uso'],
  ['healthcare', 'Salud'], ['opening_hours', 'Horario'], ['operator', 'Operador'],
  ['website', 'Sitio web'], ['wheelchair', 'Accesible en silla de ruedas'], ['building:levels', 'Pisos'],
];

/** Traducción de valores OSM frecuentes (no agrega información, solo idioma). */
const VALUE_ES: Readonly<Record<string, string>> = {
  library: 'Biblioteca', place_of_worship: 'Lugar de culto', university: 'Universidad', school: 'Escuela',
  college: 'Instituto', cafe: 'Cafetería', restaurant: 'Restaurante', hospital: 'Hospital', clinic: 'Clínica',
  pharmacy: 'Farmacia', bank: 'Banco', atm: 'Cajero automático', police: 'Seguridad', fire_station: 'Bomberos',
  bus_station: 'Terminal de ómnibus', townhall: 'Municipalidad', parking: 'Estacionamiento', supermarket: 'Supermercado',
  sports_centre: 'Centro deportivo', educational_institution: 'Institución educativa', it: 'Tecnología / IT',
  research: 'Investigación', government: 'Gestión', no: 'No', limited: 'Parcialmente',
};
const es = (v: string): string => VALUE_ES[v] ?? v;

const NOTE = 'Archivo editable a mano. Para que el generador no pise una entrada, poné "manual": true; ' +
  'los campos con "source": "manual" y las descripciones manuales también se preservan. No inventar datos institucionales.';

/** Genera la info por edificio solo con datos de OSM y referencias, citando el origen (INT-5). */
export function generateBuildingInfo(
  world: WorldData, tagsById: ReadonlyMap<string, Readonly<Record<string, string>>>,
  refs: ReadonlyMap<string, RefsLike>, generatedAt: string,
): BuildingInfoFile {
  const pois = new Map(world.pois.map((p) => [p.id, p]));
  const buildings: Record<string, BuildingInfo> = {};
  for (const b of world.buildings) {
    const tags = tagsById.get(b.id) ?? {};
    const src = `OSM ${b.id}`;
    const fields: InfoField[] = [];
    for (const [key, label] of TAG_FIELDS) {
      const v = tags[key];
      if (v && v !== 'yes') fields.push({ label, value: key === 'opening_hours' || key === 'website' ? v : es(v), source: key === 'opening_hours' ? `${src} (opening_hours)` : src });
    }
    for (const id of b.poiIds) {
      const poi = pois.get(id);
      if (poi && poi.name !== b.name) fields.push({ label: 'Dentro funciona', value: poi.name, source: `OSM ${id}` });
    }
    const ref = refs.get(b.id);
    const refUrls = (ref?.refs ?? []).map((r) => r.sourcePageUrl).filter((u): u is string => !!u);
    if (!tags['building:levels'] && ref?.summary?.levels && refUrls[0]) {
      fields.push({ label: 'Pisos', value: String(ref.summary.levels), source: refUrls[0] });
    }
    buildings[b.id] = {
      name: { value: b.name, source: b.identified ? src : `${src} (sin name)` },
      description: { value: null, source: null },
      fields,
      references: [...new Set(refUrls)],
    };
  }
  return { generatedAt, note: NOTE, buildings };
}

/** INT-4: combina preservando lo manual. */
export function mergeBuildingInfo(existing: BuildingInfoFile | null, generated: BuildingInfoFile): BuildingInfoFile {
  if (!existing) return generated;
  const out: Record<string, BuildingInfo> = { ...generated.buildings };
  for (const [id, prev] of Object.entries(existing.buildings)) {
    const gen = generated.buildings[id];
    if (prev.manual || !gen) {
      out[id] = prev;
      continue;
    }
    const manualFields = prev.fields.filter((f) => f.source === 'manual');
    out[id] = {
      ...gen,
      name: prev.name.source === 'manual' ? prev.name : gen.name,
      description: prev.description.source ? prev.description : gen.description,
      fields: [...gen.fields, ...manualFields],
    };
  }
  return { generatedAt: generated.generatedAt, note: generated.note, buildings: out };
}
