import { InputState, type InputSource } from './InputState';

const DEADZONE = 0.15;
const LOOK_SPEED = 0.05;
/** Mapeo "standard" de la Gamepad API. */
const BTN = { A: 0, B: 1, X: 2, Y: 3, RB: 5 } as const;

const dz = (v: number): number => (Math.abs(v) < DEADZONE ? 0 : (v - Math.sign(v) * DEADZONE) / (1 - DEADZONE));

/** Gamepad estándar (CTL-1): stick izq. mover, der. mirar, A saltar, X interactuar, Y bici, B aparecer bici, RB correr. */
export class GamepadSource implements InputSource {
  private prev: boolean[] = [];

  poll(): InputState {
    const pad = navigator.getGamepads?.().find((g) => g && g.mapping === 'standard') ?? null;
    if (!pad) return InputState.empty();
    const pressed = pad.buttons.map((b) => b.pressed);
    const edge = (i: number): boolean => !!pressed[i] && !this.prev[i];
    const s: InputState = {
      ...InputState.empty(),
      moveX: dz(pad.axes[0] ?? 0),
      moveY: -dz(pad.axes[1] ?? 0),
      lookDX: -dz(pad.axes[2] ?? 0) * LOOK_SPEED,
      lookDY: dz(pad.axes[3] ?? 0) * LOOK_SPEED,
      run: !!pressed[BTN.RB],
      jump: edge(BTN.A),
      interact: edge(BTN.X),
      mount: edge(BTN.Y),
      spawnBike: edge(BTN.B),
    };
    this.prev = pressed;
    return s;
  }
}
