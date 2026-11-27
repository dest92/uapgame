import { describe, it, expect } from 'vitest';
import { heroPlacement, osmKeyFromFile } from '../../src/world/buildings/heroPlacement';
import { makeWorld } from '../fixtures/world';

describe('hero assets (spec 011)', () => {
  it('HERO-1: la clave de archivo mapea al id OSM', () => {
    expect(osmKeyFromFile('way-388495172')).toBe('way/388495172');
    expect(osmKeyFromFile('relation-16816367')).toBe('relation/16816367');
  });
  it('HERO-2: se ubica en el centroide del footprint, apoyado en el suelo', () => {
    const b = makeWorld().buildings[0]!;
    expect(heroPlacement(b, { heightAt: () => 3 })).toEqual({ x: 10, y: 3, z: 5 });
  });
  it('HERO-2: en pendiente se apoya a la cota del acceso principal (la puerta no queda enterrada)', () => {
    const b = makeWorld().buildings[0]!;
    const e = b.entrance.position;
    expect(heroPlacement(b, { heightAt: (x) => x * 0.1 }).y).toBeCloseTo(e.x * 0.1);
  });
});
