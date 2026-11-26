import { describe, it, expect } from 'vitest';
import { roadWidth, normalizeSurface, classifyHighway, classifyArea } from '@shared/world/featureRules';

describe('feature rules', () => {
  it('WLD-6: anchos por tipo', () => {
    expect(roadWidth('primary')).toBe(9);
    expect(roadWidth('secondary')).toBe(7.5);
    expect(roadWidth('residential')).toBe(6);
    expect(roadWidth('service')).toBe(4);
    expect(roadWidth('footway')).toBeGreaterThanOrEqual(2);
    expect(roadWidth('footway')).toBeLessThanOrEqual(3);
    expect(roadWidth('steps')).toBe(2);
  });
  it('WLD-6: ancho explícito "width" tiene prioridad', () => {
    expect(roadWidth('footway', '4.5')).toBe(4.5);
  });
  it('WLD-6: superficie normalizada con default por tipo', () => {
    expect(normalizeSurface('asphalt', 'residential')).toBe('asphalt');
    expect(normalizeSurface('paving_stones', 'footway')).toBe('paved');
    expect(normalizeSurface('compacted', 'unclassified')).toBe('gravel');
    expect(normalizeSurface('dirt', 'path')).toBe('unpaved');
    expect(normalizeSurface(undefined, 'residential')).toBe('asphalt');
    expect(normalizeSurface(undefined, 'footway')).toBe('paved');
  });
  it('WLD-6: clasifica highways', () => {
    expect(classifyHighway('residential')).toBe('road');
    expect(classifyHighway('footway')).toBe('path');
    expect(classifyHighway('traffic_signals')).toBeNull();
  });
  it('WLD-7: clasifica áreas', () => {
    expect(classifyArea({ leisure: 'park' })).toBe('park');
    expect(classifyArea({ leisure: 'garden' })).toBe('garden');
    expect(classifyArea({ landuse: 'grass' })).toBe('grass');
    expect(classifyArea({ leisure: 'pitch', sport: 'soccer' })).toBe('pitch');
    expect(classifyArea({ amenity: 'parking' })).toBe('parking');
    expect(classifyArea({ leisure: 'swimming_pool' })).toBe('water');
    expect(classifyArea({ leisure: 'track' })).toBe('track');
    expect(classifyArea({ landuse: 'religious' })).toBe('grass');
    expect(classifyArea({ amenity: 'university' })).toBeNull();
  });
});
