/**
 * Acumulador de paso fijo (LOOP-1/2). Separa la simulación determinista (física,
 * estado) del render, que recibe `alpha` para interpolar.
 */
export class FixedStepClock {
  private accumulator = 0;

  constructor(
    readonly step = 1 / 60,
    private readonly maxFrame = 0.25,
  ) {}

  /** Avanza `frameDt` segundos ejecutando `tick` las veces necesarias. Devuelve alpha ∈ [0,1). */
  advance(frameDt: number, tick: (dt: number) => void): number {
    this.accumulator += Math.min(Math.max(frameDt, 0), this.maxFrame);
    while (this.accumulator >= this.step - 1e-9) {
      tick(this.step);
      this.accumulator -= this.step;
    }
    return Math.max(0, this.accumulator / this.step);
  }
}
