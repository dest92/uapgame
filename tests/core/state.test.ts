import { describe, it, expect } from 'vitest';
import { GameState } from '../../src/core/state/GameState';

describe('GameState (STATE-1/2)', () => {
  it('STATE-1: crea, actualiza y elimina entidades', () => {
    const s = new GameState();
    const e = s.spawn({ kind: 'player', position: { x: 1, y: 2, z: 3 } });
    s.update(e.id, { position: { x: 5, y: 2, z: 3 }, anim: 'walk' });
    expect(s.get(e.id)).toMatchObject({ kind: 'player', position: { x: 5 }, anim: 'walk' });
    s.remove(e.id);
    expect(s.get(e.id)).toBeUndefined();
  });
  it('STATE-2: snapshot es JSON-serializable y desacoplado', () => {
    const s = new GameState();
    const e = s.spawn({ kind: 'player', position: { x: 0, y: 0, z: 0 } });
    const snap = s.snapshot();
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
    s.update(e.id, { position: { x: 9, y: 0, z: 0 } });
    expect(snap.entities[0]!.position.x).toBe(0);
    expect(snap.tick).toBe(0);
  });
});
