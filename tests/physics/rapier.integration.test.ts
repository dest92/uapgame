import { describe, it, expect, beforeAll } from 'vitest';
import { RapierPhysicsWorld } from '../../src/physics/RapierPhysicsWorld';
import { footprintPrism, gridTrimesh } from '../../src/physics/colliderShapes';
import type { CharacterBody } from '../../src/physics/PhysicsWorld';

describe('RapierPhysicsWorld (integración)', () => {
  let world: RapierPhysicsWorld;
  let ch: CharacterBody;
  const settle = (n: number, d = { x: 0, y: -0.2, z: 0 }) => {
    let grounded = false;
    for (let i = 0; i < n; i++) {
      grounded = ch.move(d).grounded;
      world.step(1 / 60);
    }
    return grounded;
  };

  beforeAll(async () => {
    world = await RapierPhysicsWorld.create();
    world.addStaticMesh(gridTrimesh({ originX: -50, originZ: -50, cellSize: 25, cols: 5, rows: 5, heights: new Array(25).fill(0) }));
    world.addStaticMesh(footprintPrism([{ x: 5, z: -5 }, { x: 5, z: 5 }, { x: 10, z: 5 }, { x: 10, z: -5 }], -1, 6));
    ch = world.createCharacter({ position: { x: 0, y: 2, z: 0 }, radius: 0.3, halfHeight: 0.6 });
    world.step(1 / 60);
  });

  it('el personaje cae y se apoya sobre el terreno', () => {
    expect(settle(60)).toBe(true);
    expect(ch.position.y).toBeGreaterThan(0.85);
    expect(ch.position.y).toBeLessThan(1.0);
  });

  it('las paredes de los edificios bloquean el movimiento', () => {
    for (let i = 0; i < 120; i++) {
      ch.move({ x: 0.1, y: -0.1, z: 0 });
      world.step(1 / 60);
    }
    expect(ch.position.x).toBeLessThan(5);
    expect(ch.position.x).toBeGreaterThan(4.4);
  });

  it('CAM-2: el rayo de cámara impacta la pared e ignora al personaje', () => {
    const d = world.raycast({ x: ch.position.x - 2, y: 1.5, z: 0 }, { x: 1, y: 0, z: 0 }, 50);
    expect(d).not.toBeNull();
    expect(d!).toBeCloseTo(2 + (5 - ch.position.x), 1);
  });
});
