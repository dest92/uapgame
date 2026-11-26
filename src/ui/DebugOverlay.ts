import type { EventBus } from '../core/events/EventBus';
import type { GameEvents } from '../core/events/GameEvents';
import { el } from './dom';

export interface RenderStats {
  readonly drawCalls: number;
  readonly triangles: number;
  readonly backend: string;
  readonly quality: string;
}

/** PERF-1: overlay F3 con fps, ms, draw calls, triángulos y backend. */
export class DebugOverlay {
  private readonly root: HTMLElement;
  private frames = 0;
  private acc = 0;
  private worst = 0;
  private visible = new URLSearchParams(location.search).has('debug');

  constructor(parent: HTMLElement, bus: EventBus<GameEvents>, private readonly stats: () => RenderStats) {
    this.root = el('pre', { className: 'debug glass' });
    this.root.hidden = !this.visible;
    parent.appendChild(this.root);
    bus.on('debug:toggle', () => {
      this.visible = !this.visible;
      this.root.hidden = !this.visible;
    });
  }

  update(dt: number): void {
    this.frames++;
    this.acc += dt;
    this.worst = Math.max(this.worst, dt);
    if (this.acc < 0.5) return;
    if (this.visible) {
      const s = this.stats();
      this.root.textContent =
        `FPS        ${(this.frames / this.acc).toFixed(0)}\n` +
        `ms/frame   ${((this.acc / this.frames) * 1000).toFixed(1)} (peor ${(this.worst * 1000).toFixed(0)})\n` +
        `Draw calls ${s.drawCalls}\n` +
        `Triángulos ${s.triangles.toLocaleString('es-AR')}\n` +
        `Backend    ${s.backend}\n` +
        `Calidad    ${s.quality}`;
    }
    this.frames = 0;
    this.acc = 0;
    this.worst = 0;
  }
}
