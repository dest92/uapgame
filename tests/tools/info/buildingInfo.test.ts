import { describe, it, expect } from 'vitest';
import { generateBuildingInfo, mergeBuildingInfo, type BuildingInfoFile } from '../../../tools/lib/info/buildingInfo';
import { makeWorld } from '../../fixtures/world';

const world = makeWorld();
const tagsById = new Map<string, Record<string, string>>([
  ['way/10', { building: 'yes', amenity: 'library', name: 'Biblioteca', opening_hours: 'Mo-Fr 08:00-20:00', website: 'https://uap.edu.ar' }],
  ['node/99', { name: 'Rectoría', office: 'yes' }],
]);
const w = { ...world, buildings: [{ ...world.buildings[0]!, poiIds: ['node/99'] }], pois: [{ id: 'node/99', name: 'Rectoría', category: 'office=yes', position: { x: 5, z: 5 }, tags: { name: 'Rectoría', office: 'yes' } }] };
const refs = new Map([['way/10', { refs: [{ sourcePageUrl: 'https://uap.edu.ar/biblioteca' }], summary: { levels: 3, notes: 'fachada de vidrio' } }]]);

describe('buildings-info (INT-4/5)', () => {
  const gen = generateBuildingInfo(w, tagsById, refs, '2026-11-26');

  it('INT-5: cada dato cita su origen', () => {
    const b = gen.buildings['way/10']!;
    expect(b.name).toEqual({ value: 'Biblioteca', source: 'OSM way/10' });
    for (const f of b.fields) expect(f.source).toBeTruthy();
    expect(b.fields.find((f) => f.label === 'Horario')).toMatchObject({ value: 'Mo-Fr 08:00-20:00', source: 'OSM way/10 (opening_hours)' });
    expect(b.fields.find((f) => f.value === 'Rectoría')?.source).toBe('OSM node/99');
    expect(b.fields.find((f) => f.label === 'Pisos')).toMatchObject({ value: '3', source: 'https://uap.edu.ar/biblioteca' });
  });

  it('no inventa: sin descripción ni historia generada', () => {
    expect(gen.buildings['way/10']!.description).toEqual({ value: null, source: null });
  });

  it('INT-4: preserva entradas manuales y campos manuales', () => {
    const existing: BuildingInfoFile = {
      generatedAt: 'old', note: '',
      buildings: {
        'way/10': {
          ...gen.buildings['way/10']!,
          description: { value: 'Texto escrito a mano', source: 'manual' },
          fields: [...gen.buildings['way/10']!.fields, { label: 'Contacto', value: 'x', source: 'manual' }],
        },
        'way/77': { name: { value: 'Edificio manual', source: 'manual' }, fields: [], description: { value: null, source: null }, references: [], manual: true },
      },
    };
    const merged = mergeBuildingInfo(existing, gen);
    expect(merged.buildings['way/10']!.description.value).toBe('Texto escrito a mano');
    expect(merged.buildings['way/10']!.fields.some((f) => f.label === 'Contacto')).toBe(true);
    expect(merged.buildings['way/77']!.name.value).toBe('Edificio manual');
    expect(merged.generatedAt).toBe('2026-11-26');
  });
});
