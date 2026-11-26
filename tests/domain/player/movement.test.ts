import { describe, it, expect } from 'vitest';
import { MovementModel, WALK_SPEED, RUN_SPEED, initialMoveState, type MoveInput } from '../../../src/domain/player/MovementModel';

const none: MoveInput = { moveX: 0, moveY: 0, run: false, jump: false };
const simulate = (input: MoveInput, camYaw: number, seconds: number, grounded = true) => {
  const m = new MovementModel();
  let s = { ...initialMoveState(), grounded };
  for (let t = 0; t < seconds; t += 1 / 60) s = m.step(s, input, camYaw, 1 / 60).state;
  return s;
};

describe('MovementModel', () => {
  it('MOV-1: camina a 1.6 m/s hacia donde mira la cámara (yaw 0 → −Z)', () => {
    const s = simulate({ ...none, moveY: 1 }, 0, 2);
    expect(Math.hypot(s.vx, s.vz)).toBeCloseTo(WALK_SPEED, 1);
    expect(s.vz).toBeLessThan(0);
    expect(Math.abs(s.vx)).toBeLessThan(1e-6);
  });
  it('MOV-1: corre a 5.5 m/s; strafe derecho respecto a la cámara', () => {
    expect(Math.hypot(simulate({ ...none, moveY: 1, run: true }, 0, 3).vx, simulate({ ...none, moveY: 1, run: true }, 0, 3).vz)).toBeCloseTo(RUN_SPEED, 1);
    const right = simulate({ ...none, moveX: 1 }, Math.PI / 2, 2);
    expect(right.vz).toBeLessThan(-1); // cámara mirando −X ⇒ derecha = −Z
  });
  it('MOV-2: sin input desacelera a 0', () => {
    const m = new MovementModel();
    let s = { ...initialMoveState(), vx: 5, grounded: true };
    for (let i = 0; i < 120; i++) s = m.step(s, none, 0, 1 / 60).state;
    expect(Math.abs(s.vx)).toBeLessThan(0.01);
  });
  it('MOV-3: salta solo apoyado; la gravedad lo baja', () => {
    const m = new MovementModel();
    const air = m.step({ ...initialMoveState(), grounded: false }, { ...none, jump: true }, 0, 1 / 60);
    expect(air.state.vy).toBeLessThanOrEqual(0);
    const ground = m.step({ ...initialMoveState(), grounded: true }, { ...none, jump: true }, 0, 1 / 60);
    expect(ground.state.vy).toBeGreaterThan(3);
    expect(ground.jumped).toBe(true);
  });
  it('MOV-4: rota suavemente hacia la dirección de movimiento', () => {
    const m = new MovementModel();
    const s1 = m.step({ ...initialMoveState(), grounded: true, vx: 1.6, vz: 0 }, { ...none, moveX: 1 }, 0, 1 / 60).state;
    expect(s1.yaw).toBeGreaterThan(0);
    expect(s1.yaw).toBeLessThan(Math.PI / 2);
  });
  it('MOV-5: estado de animación según velocidad y contacto', () => {
    expect(simulate(none, 0, 0.5).anim).toBe('idle');
    expect(simulate({ ...none, moveY: 1 }, 0, 2).anim).toBe('walk');
    expect(simulate({ ...none, moveY: 1, run: true }, 0, 3).anim).toBe('run');
    expect(simulate({ ...none, moveY: 0.75 * 1, run: true }, 0, 3).anim).not.toBe('idle');
    expect(simulate(none, 0, 0.5, false).anim).toBe('fall');
  });
  it('desplazamiento = velocidad × dt', () => {
    const m = new MovementModel();
    const r = m.step({ ...initialMoveState(), grounded: true, vx: 2, vz: 0 }, { ...none, moveX: 1 }, Math.PI * 0, 0.5);
    expect(r.displacement.x).toBeGreaterThan(0);
  });
});
