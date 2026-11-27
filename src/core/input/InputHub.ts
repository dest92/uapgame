import type { GameSystem } from '../loop/GameLoop';
import { InputState, mergeSources, type InputSource } from './InputState';

/**
 * Concentra las fuentes de input. Se actualiza una vez por frame; las acciones de
 * un solo disparo (saltar, interactuar) quedan "enganchadas" hasta que el paso
 * fijo las consume, para no perderlas entre frames y pasos de simulación.
 */
export class InputHub implements GameSystem {
  private readonly sources: InputSource[] = [];
  private current = InputState.empty();
  private jumpLatched = false;
  private interactLatched = false;
  private mountLatched = false;
  private spawnLatched = false;
  /** INT-6: mientras hay un panel abierto el jugador no se mueve. */
  movementBlocked = false;

  add(source: InputSource): this {
    this.sources.push(source);
    return this;
  }

  update(): void {
    this.current = mergeSources(this.sources);
    this.jumpLatched ||= this.current.jump;
    this.interactLatched ||= this.current.interact;
    this.mountLatched ||= this.current.mount;
    this.spawnLatched ||= this.current.spawnBike;
  }

  get state(): Readonly<InputState> {
    return this.current;
  }

  movement(): { moveX: number; moveY: number; run: boolean } {
    if (this.movementBlocked) return { moveX: 0, moveY: 0, run: false };
    return { moveX: this.current.moveX, moveY: this.current.moveY, run: this.current.run };
  }

  consumeJump(): boolean {
    const j = this.jumpLatched && !this.movementBlocked;
    this.jumpLatched = false;
    return j;
  }

  consumeMount(): boolean {
    const m = this.mountLatched && !this.movementBlocked;
    this.mountLatched = false;
    return m;
  }

  consumeSpawnBike(): boolean {
    const b = this.spawnLatched && !this.movementBlocked;
    this.spawnLatched = false;
    return b;
  }

  consumeInteract(): boolean {
    const i = this.interactLatched;
    this.interactLatched = false;
    return i;
  }
}
