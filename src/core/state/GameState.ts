export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type EntityKind = 'player' | 'remote-player' | 'npc';
export type AnimState = 'idle' | 'walk' | 'jog' | 'run' | 'jump' | 'fall';

/** Entidad serializable: sin referencias a motores (STATE-1). */
export interface Entity {
  readonly id: string;
  readonly kind: EntityKind;
  readonly position: Vec3;
  /** Rotación sobre Y (rad). */
  readonly yaw: number;
  readonly anim: AnimState;
  readonly speed: number;
}

export interface Snapshot {
  readonly tick: number;
  readonly entities: readonly Entity[];
}

type EntityPatch = Partial<Omit<Entity, 'id' | 'kind'>>;

/**
 * Estado autoritativo del juego. Hoy lo escribe el cliente; mañana un servidor
 * (Colyseus) podría reemplazarlo enviando snapshots (STATE-2).
 */
export class GameState {
  private readonly entities = new Map<string, Entity>();
  private nextId = 1;
  private tickCount = 0;

  spawn(init: { kind: EntityKind; position: Vec3; yaw?: number; id?: string }): Entity {
    const e: Entity = {
      id: init.id ?? `e${this.nextId++}`,
      kind: init.kind,
      position: { ...init.position },
      yaw: init.yaw ?? 0,
      anim: 'idle',
      speed: 0,
    };
    this.entities.set(e.id, e);
    return e;
  }

  get(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  update(id: string, patch: EntityPatch): void {
    const e = this.entities.get(id);
    if (e) this.entities.set(id, { ...e, ...patch });
  }

  remove(id: string): void {
    this.entities.delete(id);
  }

  tick(): void {
    this.tickCount++;
  }

  snapshot(): Snapshot {
    return {
      tick: this.tickCount,
      entities: [...this.entities.values()].map((e) => ({ ...e, position: { ...e.position } })),
    };
  }
}
