import { FixedStepClock } from './FixedStepClock';

/** Contrato de un sistema del juego: simulación a paso fijo y/o actualización por frame. */
export interface GameSystem {
  fixedUpdate?(dt: number): void;
  /** `alpha`: interpolación entre el último paso fijo y el siguiente. */
  update?(dt: number, alpha: number): void;
}

/** Loop principal basado en requestAnimationFrame; no conoce Three ni Rapier. */
export class GameLoop {
  private readonly systems: GameSystem[] = [];
  private readonly clock = new FixedStepClock();
  private last = 0;
  private handle = 0;
  private running = false;

  add(system: GameSystem): this {
    this.systems.push(system);
    return this;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const frame = (now: number): void => {
      if (!this.running) return;
      const dt = (now - this.last) / 1000;
      this.last = now;
      const alpha = this.clock.advance(dt, (step) => {
        for (const s of this.systems) s.fixedUpdate?.(step);
      });
      const frameDt = Math.min(dt, 0.1);
      for (const s of this.systems) s.update?.(frameDt, alpha);
      this.handle = requestAnimationFrame(frame);
    };
    this.handle = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.handle);
  }
}
