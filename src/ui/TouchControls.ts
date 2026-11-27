import { InputState, type InputSource } from '../core/input/InputState';
import { el } from './dom';

const LOOK_SENSITIVITY = 0.006;
const STICK_RADIUS = 56;

/** Joystick virtual (izquierda), arrastre para mirar (derecha) y botones (INP-1, mobile). */
export class TouchControls implements InputSource {
  private stickId: number | null = null;
  private lookId: number | null = null;
  private origin = { x: 0, y: 0 };
  private move = { x: 0, y: 0 };
  private look = { dx: 0, dy: 0, lastX: 0, lastY: 0 };
  private jump = false;
  private interact = false;
  private mount = false;
  private run = false;
  private readonly knob: HTMLElement;
  private readonly base: HTMLElement;

  constructor(parent: HTMLElement, surface: HTMLElement) {
    this.knob = el('div', { className: 'stick__knob' });
    this.base = el('div', { className: 'stick' }, [this.knob]);
    const btn = (label: string, cls: string, onDown: () => void): HTMLButtonElement => {
      const b = el('button', { className: `tbtn ${cls}`, text: label, attrs: { type: 'button' } });
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        onDown();
      });
      return b;
    };
    const runBtn = btn('Correr', 'tbtn--run', () => {
      this.run = !this.run;
      runBtn.classList.toggle('tbtn--on', this.run);
    });
    parent.appendChild(el('div', { className: 'touch' }, [
      this.base, btn('Saltar', 'tbtn--jump', () => (this.jump = true)), runBtn, btn('E', 'tbtn--use', () => (this.interact = true)), btn('Bici', 'tbtn--bike', () => (this.mount = true)),
    ]));
    surface.addEventListener('pointerdown', this.onDown);
    surface.addEventListener('pointermove', this.onMove);
    surface.addEventListener('pointerup', this.onUp);
    surface.addEventListener('pointercancel', this.onUp);
  }

  private readonly onDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse') return;
    if (e.clientX < window.innerWidth * 0.45 && this.stickId === null) {
      this.stickId = e.pointerId;
      this.origin = { x: e.clientX, y: e.clientY };
      this.base.style.transform = `translate(${e.clientX - STICK_RADIUS}px, ${e.clientY - STICK_RADIUS}px)`;
      this.base.classList.add('stick--active');
    } else if (this.lookId === null) {
      this.lookId = e.pointerId;
      this.look.lastX = e.clientX;
      this.look.lastY = e.clientY;
    }
  };

  private readonly onMove = (e: PointerEvent): void => {
    if (e.pointerId === this.stickId) {
      const dx = e.clientX - this.origin.x;
      const dy = e.clientY - this.origin.y;
      const len = Math.min(STICK_RADIUS, Math.hypot(dx, dy));
      const a = Math.atan2(dy, dx);
      this.move = { x: (Math.cos(a) * len) / STICK_RADIUS, y: (-Math.sin(a) * len) / STICK_RADIUS };
      this.knob.style.transform = `translate(${Math.cos(a) * len}px, ${Math.sin(a) * len}px)`;
    } else if (e.pointerId === this.lookId) {
      this.look.dx += e.clientX - this.look.lastX;
      this.look.dy += e.clientY - this.look.lastY;
      this.look.lastX = e.clientX;
      this.look.lastY = e.clientY;
    }
  };

  private readonly onUp = (e: PointerEvent): void => {
    if (e.pointerId === this.stickId) {
      this.stickId = null;
      this.move = { x: 0, y: 0 };
      this.knob.style.transform = '';
      this.base.classList.remove('stick--active');
    } else if (e.pointerId === this.lookId) {
      this.lookId = null;
    }
  };

  poll(): InputState {
    const s: InputState = {
      ...InputState.empty(),
      moveX: this.move.x,
      moveY: this.move.y,
      // Con el stick casi al tope se trota; el botón "Correr" fuerza sprint.
      run: this.run,
      jump: this.jump,
      interact: this.interact,
      mount: this.mount,
      lookDX: -this.look.dx * LOOK_SENSITIVITY,
      lookDY: this.look.dy * LOOK_SENSITIVITY,
    };
    this.look.dx = this.look.dy = 0;
    this.jump = this.interact = this.mount = false;
    return s;
  }
}
