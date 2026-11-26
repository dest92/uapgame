import { WORLD_SCHEMA_VERSION, type WorldData } from './types';

export class WorldValidationError extends Error {
  constructor(path: string, problem: string) {
    super(`world.json inválido en ${path}: ${problem}`);
    this.name = 'WorldValidationError';
  }
}

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function obj(v: unknown, path: string): Obj {
  if (!isObj(v)) throw new WorldValidationError(path, 'se esperaba un objeto');
  return v;
}
function arr(v: unknown, path: string, min = 0): unknown[] {
  if (!Array.isArray(v)) throw new WorldValidationError(path, 'se esperaba un array');
  if (v.length < min) throw new WorldValidationError(path, `se esperaban ≥ ${min} elementos`);
  return v;
}
function num(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new WorldValidationError(path, 'número inválido');
  return v;
}
function str(v: unknown, path: string): string {
  if (typeof v !== 'string') throw new WorldValidationError(path, 'se esperaba un string');
  return v;
}
function vec2(v: unknown, path: string): void {
  const o = obj(v, path);
  num(o['x'], `${path}.x`);
  num(o['z'], `${path}.z`);
}
function vecList(v: unknown, path: string, min: number): void {
  arr(v, path, min).forEach((p, i) => vec2(p, `${path}[${i}]`));
}

function eachOf(root: Obj, key: string, check: (item: Obj, path: string) => void): void {
  arr(root[key], key).forEach((item, i) => check(obj(item, `${key}[${i}]`), `${key}[${i}]`));
}

/**
 * Valida la forma de world.json (WLD-11). Es intencionalmente estructural: verifica
 * lo que el juego necesita para no romper, no reglas de negocio.
 */
export function validateWorld(input: unknown): WorldData {
  const root = obj(input, 'world');
  if (root['version'] !== WORLD_SCHEMA_VERSION) {
    throw new WorldValidationError('version', `se esperaba ${WORLD_SCHEMA_VERSION}, llegó ${String(root['version'])}`);
  }
  str(root['attribution'], 'attribution');
  const origin = obj(root['origin'], 'origin');
  num(origin['lon'], 'origin.lon');
  num(origin['lat'], 'origin.lat');
  const bounds = obj(root['bounds'], 'bounds');
  for (const k of ['minX', 'minZ', 'maxX', 'maxZ']) num(bounds[k], `bounds.${k}`);
  vecList(obj(root['campus'], 'campus')['outline'], 'campus.outline', 3);
  str(obj(root['terrain'], 'terrain')['kind'], 'terrain.kind');

  eachOf(root, 'buildings', (b, p) => {
    str(b['id'], `${p}.id`);
    str(b['name'], `${p}.name`);
    vecList(b['footprint'], `${p}.footprint`, 3);
    vec2(b['centroid'], `${p}.centroid`);
    num(b['height'], `${p}.height`);
    num(b['minHeight'], `${p}.minHeight`);
    const roof = obj(b['roof'], `${p}.roof`);
    str(roof['shape'], `${p}.roof.shape`);
    num(roof['height'], `${p}.roof.height`);
    obj(b['appearance'], `${p}.appearance`);
    const e = obj(b['entrance'], `${p}.entrance`);
    vec2(e['position'], `${p}.entrance.position`);
    vec2(e['normal'], `${p}.entrance.normal`);
  });
  eachOf(root, 'roads', (r, p) => {
    str(r['id'], `${p}.id`);
    num(r['width'], `${p}.width`);
    vecList(r['points'], `${p}.points`, 2);
  });
  eachOf(root, 'areas', (a, p) => {
    str(a['kind'], `${p}.kind`);
    vecList(a['polygon'], `${p}.polygon`, 3);
  });
  eachOf(root, 'trees', (t, p) => vec2(t['position'], `${p}.position`));
  eachOf(root, 'pois', (t, p) => {
    str(t['name'], `${p}.name`);
    vec2(t['position'], `${p}.position`);
  });
  return root as unknown as WorldData;
}
