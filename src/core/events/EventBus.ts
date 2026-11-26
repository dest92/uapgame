type Handler<T> = (payload: T) => void;

/** Bus de eventos tipado (EVT-1). */
export class EventBus<Events extends Record<string, unknown>> {
  private readonly handlers = new Map<keyof Events, Set<Handler<never>>>();

  on<K extends keyof Events>(type: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(handler as Handler<never>);
    return () => this.off(type, handler);
  }

  off<K extends keyof Events>(type: K, handler: Handler<Events[K]>): void {
    this.handlers.get(type)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    for (const h of [...(this.handlers.get(type) ?? [])]) {
      try {
        (h as Handler<Events[K]>)(payload);
      } catch (err) {
        console.error(`[EventBus] handler de "${String(type)}" falló`, err);
      }
    }
  }
}
