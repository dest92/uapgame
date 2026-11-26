import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../events/GameEvents';
import { InputState, type InputSource } from './InputState';
import { KeyMap } from './KeyMap';

const MOUSE_SENSITIVITY = 0.0025;

/** Teclado + mouse (pointer lock al hacer click en el canvas). INP-1. */
export class KeyboardMouseSource implements InputSource {
  private readonly pressed = new Set<string>();
  private lookDX = 0;
  private lookDY = 0;
  private zoom = 0;
  private jump = false;
  private interact = false;
  private dragging = false;

  constructor(
    canvas: HTMLElement,
    private readonly bus: EventBus<GameEvents>,
    private readonly keys = new KeyMap(),
  ) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', (e) => this.pressed.delete(e.code));
    window.addEventListener('blur', () => this.pressed.clear());
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.dragging = true;
      if (!matchMedia('(pointer: coarse)').matches) canvas.requestPointerLock?.()?.catch?.(() => {});
    });
    window.addEventListener('mouseup', () => (this.dragging = false));
    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== canvas && !this.dragging) return;
      this.lookDX += e.movementX;
      this.lookDY += e.movementY;
    });
    canvas.addEventListener('wheel', (e) => {
      this.zoom += Math.sign(e.deltaY) * 0.6;
      e.preventDefault();
    }, { passive: false });
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (this.keys.isAction('debug', e.code)) {
      e.preventDefault();
      this.bus.emit('debug:toggle', undefined);
      return;
    }
    if (this.keys.isAction('menu', e.code) && !e.repeat) this.bus.emit('ui:escape', undefined);
    if (!e.repeat && this.keys.isAction('jump', e.code)) this.jump = true;
    if (!e.repeat && this.keys.isAction('interact', e.code)) this.interact = true;
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    this.pressed.add(e.code);
  };

  poll(): InputState {
    const axes = this.keys.axes(this.pressed);
    const s: InputState = {
      ...InputState.empty(),
      moveX: axes.x,
      moveY: axes.y,
      run: this.keys.held('run', this.pressed),
      jump: this.jump,
      interact: this.interact,
      lookDX: -this.lookDX * MOUSE_SENSITIVITY,
      lookDY: this.lookDY * MOUSE_SENSITIVITY,
      zoom: this.zoom,
    };
    this.lookDX = this.lookDY = this.zoom = 0;
    this.jump = this.interact = false;
    return s;
  }
}
