import { describe, it, expect } from 'vitest';
import { createEnuProjection } from '@shared/geo/enu';

const origin = { lon: -60.4672, lat: -32.0734 };

describe('createEnuProjection', () => {
  const proj = createEnuProjection(origin);

  it('GEO-1: el origen proyecta a (0,0)', () => {
    const p = proj.toLocal(origin);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.z).toBeCloseTo(0, 9);
  });

  it('GEO-2: 0.001° al norte → z ≈ −110.9 m', () => {
    const p = proj.toLocal({ lon: origin.lon, lat: origin.lat + 0.001 });
    expect(p.x).toBeCloseTo(0, 6);
    expect(Math.abs(p.z + 110.9)).toBeLessThan(0.5);
  });

  it('GEO-3: 0.001° al este a −32° → x ≈ 94.3 m', () => {
    const p = proj.toLocal({ lon: origin.lon + 0.001, lat: origin.lat });
    expect(Math.abs(p.x - 94.3)).toBeLessThan(0.5);
    expect(p.z).toBeCloseTo(0, 6);
  });

  it('GEO-4: toGeo es la inversa de toLocal', () => {
    for (const [dlon, dlat] of [[0.01, 0.01], [-0.02, 0.005], [0.015, -0.018]] as const) {
      const g = { lon: origin.lon + dlon, lat: origin.lat + dlat };
      const back = proj.toGeo(proj.toLocal(g));
      expect(Math.abs(back.lon - g.lon)).toBeLessThan(1e-7);
      expect(Math.abs(back.lat - g.lat)).toBeLessThan(1e-7);
    }
  });
});
