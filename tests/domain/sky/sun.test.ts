import { describe, it, expect } from 'vitest';
import { sunPosition, lightingForElevation } from '../../../src/domain/sky/sunPosition';

const LAT = -32.07;
const deg = (r: number): number => (r * 180) / Math.PI;

describe('sunPosition (SKY-1)', () => {
  it('SKY-1: mediodía solar de diciembre ≈ 81° de elevación', () => {
    expect(deg(sunPosition(12, LAT, 355).elevation)).toBeCloseTo(81.4, 0);
  });
  it('SKY-1: mediodía de junio ≈ 34.5° y el sol al norte (−Z)', () => {
    const s = sunPosition(12, LAT, 172);
    expect(deg(s.elevation)).toBeCloseTo(34.5, 0);
    expect(s.direction.z).toBeLessThan(0);
    expect(Math.abs(s.direction.x)).toBeLessThan(0.05);
  });
  it('SKY-1: a medianoche está bajo el horizonte; a la mañana sale por el este (+X)', () => {
    expect(sunPosition(0, LAT, 80).elevation).toBeLessThan(0);
    const morning = sunPosition(8, LAT, 80);
    expect(morning.elevation).toBeGreaterThan(0);
    expect(morning.direction.x).toBeGreaterThan(0.3);
  });
  it('dirección unitaria', () => {
    const d = sunPosition(15.5, LAT, 300).direction;
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1, 6);
  });
  it('SKY-3: intensidad del sol cae a 0 de noche y la luz de luna/farolas se activa', () => {
    expect(lightingForElevation(-0.3).sun).toBe(0);
    expect(lightingForElevation(-0.3).night).toBeCloseTo(1);
    expect(lightingForElevation(0.8).sun).toBeGreaterThan(0.9);
    expect(lightingForElevation(0.8).night).toBe(0);
  });
});
