/** Avance automático de la hora del día (T activa/desactiva). Lógica pura. */
export class TimeFlow {
  running = false;
  /** Horas de juego por segundo real (1 h cada 20 s). */
  constructor(readonly hoursPerSecond = 1 / 20) {}

  advance(hour: number, dt: number): number {
    if (!this.running) return hour;
    return (hour + dt * this.hoursPerSecond) % 24;
  }
}
