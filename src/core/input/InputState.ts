/** Acciones abstractas del jugador (INP-1). Independientes del dispositivo. */
export interface InputState {
  /** −1..1 (derecha positiva). */
  moveX: number;
  /** −1..1 (adelante positivo). */
  moveY: number;
  run: boolean;
  jump: boolean;
  /** Disparo único (flanco) de interactuar. */
  interact: boolean;
  /** Subir/bajar de la bici (flanco). */
  mount: boolean;
  /** Aparecer una bici (flanco). */
  spawnBike: boolean;
  lookDX: number;
  lookDY: number;
  zoom: number;
}

export const InputState = {
  empty: (): InputState => ({ moveX: 0, moveY: 0, run: false, jump: false, interact: false, mount: false, spawnBike: false, lookDX: 0, lookDY: 0, zoom: 0 }),
};

/** Una fuente de input (teclado/mouse, táctil, gamepad…). `poll` consume deltas acumulados. */
export interface InputSource {
  poll(): InputState;
}

export function mergeSources(sources: readonly InputSource[]): InputState {
  const out = InputState.empty();
  for (const s of sources) {
    const p = s.poll();
    out.moveX += p.moveX;
    out.moveY += p.moveY;
    out.run ||= p.run;
    out.jump ||= p.jump;
    out.interact ||= p.interact;
    out.mount ||= p.mount;
    out.spawnBike ||= p.spawnBike;
    out.lookDX += p.lookDX;
    out.lookDY += p.lookDY;
    out.zoom += p.zoom;
  }
  const len = Math.hypot(out.moveX, out.moveY);
  if (len > 1) {
    out.moveX /= len;
    out.moveY /= len;
  }
  return out;
}
