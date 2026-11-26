import { describe, it, expect } from 'vitest';
import { resolveHeight, resolveRoof, resolveName, LEVEL_HEIGHT } from '@shared/world/buildingRules';

describe('resolveHeight (WLD-3)', () => {
  it('WLD-3: usa height explícito', () => {
    expect(resolveHeight({ building: 'yes', height: '12.5' })).toMatchObject({ height: 12.5, source: 'tag' });
  });
  it('WLD-3: acepta height con unidad "m"', () => {
    expect(resolveHeight({ building: 'yes', height: '7 m' }).height).toBe(7);
  });
  it('WLD-3: building:levels × 3.2', () => {
    expect(resolveHeight({ building: 'yes', 'building:levels': '3' })).toMatchObject({
      height: 3 * LEVEL_HEIGHT, levels: 3, source: 'levels',
    });
  });
  it('WLD-3: la referencia fotográfica pisa los defaults pero no los tags', () => {
    expect(resolveHeight({ building: 'yes' }, { levels: 4 })).toMatchObject({ levels: 4, source: 'reference' });
    expect(resolveHeight({ building: 'yes', 'building:levels': '2' }, { levels: 4 }).levels).toBe(2);
  });
  it('WLD-3: defaults por tipo', () => {
    expect(resolveHeight({ building: 'house' }).levels).toBe(1);
    expect(resolveHeight({ building: 'dormitory' }).levels).toBe(3);
    expect(resolveHeight({ building: 'church' }).height).toBe(9);
    expect(resolveHeight({ building: 'industrial' }).height).toBe(9);
    expect(resolveHeight({ building: 'yes' })).toMatchObject({ levels: 2, source: 'default' });
  });
  it('WLD-3: min_height / building:min_level', () => {
    expect(resolveHeight({ building: 'yes', height: '10', min_height: '3' }).minHeight).toBe(3);
  });
  it('WLD-3: ignora valores inválidos', () => {
    expect(resolveHeight({ building: 'yes', height: 'alto', 'building:levels': '-2' }).source).toBe('default');
  });
});

describe('resolveRoof (WLD-4)', () => {
  it('WLD-4: roof:shape explícito', () => {
    expect(resolveRoof({ 'roof:shape': 'gabled' }, 6).shape).toBe('gabled');
    expect(resolveRoof({ 'roof:shape': 'hipped' }, 6).shape).toBe('hipped');
  });
  it('WLD-4: referencia si no hay tag', () => {
    expect(resolveRoof({ building: 'yes' }, 6, { roof: 'gable' }).shape).toBe('gabled');
  });
  it('WLD-4: defaults: house/church → gabled; resto flat', () => {
    expect(resolveRoof({ building: 'house' }, 3).shape).toBe('gabled');
    expect(resolveRoof({ building: 'church' }, 9).shape).toBe('gabled');
    expect(resolveRoof({ building: 'yes' }, 6).shape).toBe('flat');
  });
  it('WLD-4: altura de techo con roof:height o proporcional', () => {
    expect(resolveRoof({ 'roof:shape': 'gabled', 'roof:height': '2.5' }, 6).height).toBe(2.5);
    expect(resolveRoof({ building: 'house' }, 3).height).toBeGreaterThan(1);
    expect(resolveRoof({ building: 'yes' }, 6).height).toBe(0);
  });
});

describe('resolveName (WLD-5)', () => {
  it('WLD-5: usa name', () => {
    expect(resolveName({ name: 'Biblioteca' }, 'way/1')).toEqual({ name: 'Biblioteca', identified: true });
  });
  it('WLD-5: sin nombre → texto estándar con id OSM', () => {
    expect(resolveName({ building: 'yes' }, 'way/42')).toEqual({
      name: 'Edificio sin identificar (OSM way 42)', identified: false,
    });
  });
  it('WLD-5: trata "NN" como sin nombre', () => {
    expect(resolveName({ name: 'NN' }, 'way/7').identified).toBe(false);
  });
});
