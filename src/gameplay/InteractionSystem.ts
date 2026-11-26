import type { EventBus } from '../core/events/EventBus';
import type { GameEvents } from '../core/events/GameEvents';
import type { InputHub } from '../core/input/InputHub';
import type { GameSystem } from '../core/loop/GameLoop';
import type { GameState } from '../core/state/GameState';
import { findInteractionTarget, type InteractionTarget } from '../domain/interaction/InteractionQuery';

/** Detecta edificios cercanos (INT-1), emite el objetivo (INT-2) y abre/cierra el panel (INT-3/6). */
export class InteractionSystem implements GameSystem {
  private target: InteractionTarget | null = null;
  private open = false;

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly input: InputHub,
    private readonly state: GameState,
    private readonly playerId: string,
    private readonly targets: readonly InteractionTarget[],
  ) {
    bus.on('interaction:close', () => this.setOpen(false));
    bus.on('ui:escape', () => this.open && this.bus.emit('interaction:close', undefined));
    bus.on('interaction:request', () => this.tryOpen());
  }

  private setOpen(v: boolean): void {
    this.open = v;
    this.input.movementBlocked = v;
  }

  private tryOpen(): void {
    if (!this.target || this.open) return;
    this.setOpen(true);
    this.bus.emit('interaction:open', { buildingId: this.target.id });
  }

  update(): void {
    const p = this.state.get(this.playerId)?.position;
    if (!p) return;
    const next = findInteractionTarget({ x: p.x, z: p.z }, this.targets);
    if (next?.id !== this.target?.id) {
      this.target = next;
      this.bus.emit('interaction:target', next ? { buildingId: next.id, name: next.name } : null);
    }
    if (this.input.consumeInteract()) {
      if (this.open) this.bus.emit('interaction:close', undefined);
      else this.tryOpen();
    }
  }
}
