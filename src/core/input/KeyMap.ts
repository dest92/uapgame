export type KeyAction = 'forward' | 'back' | 'left' | 'right' | 'run' | 'jump' | 'interact' | 'mount' | 'spawnBike' | 'debug' | 'menu';

const DEFAULT_BINDINGS: Readonly<Record<KeyAction, readonly string[]>> = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  interact: ['KeyE', 'Enter'],
  mount: ['KeyF'],
  spawnBike: ['KeyB'],
  debug: ['F3'],
  menu: ['Escape', 'KeyM'],
};

/** Mapeo configurable de códigos de tecla a acciones (INP-1). */
export class KeyMap {
  constructor(private readonly bindings: Readonly<Record<KeyAction, readonly string[]>> = DEFAULT_BINDINGS) {}

  isAction(action: KeyAction, code: string): boolean {
    return this.bindings[action].includes(code);
  }

  private any(action: KeyAction, pressed: ReadonlySet<string>): boolean {
    return this.bindings[action].some((c) => pressed.has(c));
  }

  axes(pressed: ReadonlySet<string>): { x: number; y: number } {
    const x = (this.any('right', pressed) ? 1 : 0) - (this.any('left', pressed) ? 1 : 0);
    const y = (this.any('forward', pressed) ? 1 : 0) - (this.any('back', pressed) ? 1 : 0);
    return { x, y };
  }

  held(action: KeyAction, pressed: ReadonlySet<string>): boolean {
    return this.any(action, pressed);
  }
}
