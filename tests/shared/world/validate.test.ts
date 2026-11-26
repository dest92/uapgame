import { describe, it, expect } from 'vitest';
import { validateWorld, WorldValidationError } from '@shared/world/validate';
import { makeWorld } from '../../fixtures/world';

describe('validateWorld (WLD-11)', () => {
  it('WLD-11: acepta un mundo válido', () => {
    expect(validateWorld(makeWorld()).buildings).toHaveLength(1);
  });
  it('WLD-11: rechaza versión incorrecta', () => {
    expect(() => validateWorld({ ...makeWorld(), version: 99 })).toThrow(WorldValidationError);
  });
  it('WLD-11: rechaza footprints con < 3 vértices con ruta del error', () => {
    const w = makeWorld();
    const bad = { ...w, buildings: [{ ...w.buildings[0], footprint: [{ x: 0, z: 0 }] }] };
    expect(() => validateWorld(bad)).toThrow(/buildings\[0\]\.footprint/);
  });
  it('WLD-11: rechaza números no finitos', () => {
    const w = makeWorld();
    const bad = { ...w, roads: [{ ...w.roads[0], width: Number.NaN }] };
    expect(() => validateWorld(bad)).toThrow(/roads\[0\]\.width/);
  });
  it('WLD-11: rechaza no-objetos', () => {
    expect(() => validateWorld(null)).toThrow(WorldValidationError);
  });
});
