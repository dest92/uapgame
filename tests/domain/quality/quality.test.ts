import { describe, it, expect } from 'vitest';
import { QUALITY_PROFILES, defaultQuality, QualityStore } from '../../../src/domain/quality/QualityProfiles';

describe('perfiles de calidad (QLT-1/2/3)', () => {
  it('QLT-1: cada preset escala monotónicamente', () => {
    const { low, medium, high } = QUALITY_PROFILES;
    expect(low.pixelRatioCap).toBeLessThan(high.pixelRatioCap);
    expect(low.shadowMapSize).toBeLessThan(medium.shadowMapSize);
    expect(low.grassDensity).toBeLessThan(high.grassDensity);
    expect(low.ao).toBe(false);
    expect(high.ao).toBe(true);
    expect(medium.cascades).toBeLessThanOrEqual(high.cascades);
  });
  it('QLT-2: móvil/táctil → low; desktop → medium', () => {
    expect(defaultQuality({ touch: true, mobileUA: true, cores: 8 })).toBe('low');
    expect(defaultQuality({ touch: false, mobileUA: false, cores: 8 })).toBe('medium');
  });
  it('QLT-3: persiste y tolera storage roto', () => {
    const mem = new Map<string, string>();
    const store = new QualityStore({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) });
    store.save('high');
    expect(store.load()).toBe('high');
    const broken = new QualityStore({ getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } });
    expect(() => broken.save('low')).not.toThrow();
    expect(broken.load()).toBeNull();
    expect(new QualityStore({ getItem: () => 'ultra', setItem: () => {} }).load()).toBeNull();
  });
});
