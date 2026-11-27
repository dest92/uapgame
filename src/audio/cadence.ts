/** Segundos entre pasos según la velocidad (m/s). Quieto = sin pasos. */
export function stepInterval(speed: number): number {
  if (speed < 0.2) return Infinity;
  return Math.max(0.27, 0.88 / Math.sqrt(speed / 0.62));
}

/** Probabilidad por segundo de un canto de pájaro según cuán de noche es (0 día, 1 noche). */
export const birdChance = (night: number): number => 0.6 * (1 - night) + 0.01;
