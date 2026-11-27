import { describe, it, expect } from 'vitest';
import { InputState, mergeSources, type InputSource } from '../../src/core/input/InputState';
import { KeyMap } from '../../src/core/input/KeyMap';

const src = (partial: Partial<InputState>): InputSource => ({ poll: () => ({ ...InputState.empty(), ...partial }) });

describe('input (INP-1/2)', () => {
  it('INP-2: normaliza el vector de movimiento', () => {
    const s = mergeSources([src({ moveX: 1, moveY: 1 })]);
    expect(Math.hypot(s.moveX, s.moveY)).toBeCloseTo(1);
  });
  it('INP-1: combina fuentes (suma de look, OR de botones)', () => {
    const s = mergeSources([src({ lookDX: 2, jump: true }), src({ lookDX: 3, run: true })]);
    expect(s.lookDX).toBe(5);
    expect(s.jump && s.run).toBe(true);
  });
  it('INP-1: mapa de teclas WASD/flechas → acciones', () => {
    const km = new KeyMap();
    expect(km.axes(new Set(['KeyW', 'KeyD']))).toEqual({ x: 1, y: 1 });
    expect(km.axes(new Set(['ArrowDown', 'ArrowLeft']))).toEqual({ x: -1, y: -1 });
    expect(km.isAction('interact', 'KeyE')).toBe(true);
    expect(km.isAction('jump', 'Space')).toBe(true);
    expect(km.isAction('run', 'ShiftLeft')).toBe(true);
    expect(km.isAction('mount', 'KeyF')).toBe(true);
    expect(km.isAction('spawnBike', 'KeyB')).toBe(true);
  });
});
