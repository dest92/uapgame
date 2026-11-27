import type { GameSystem } from '../core/loop/GameLoop';
import { birdChance, stepInterval } from './cadence';

export interface AudioInputs {
  readonly speed: () => number;
  readonly riding: () => boolean;
  readonly night: () => number;
}

/**
 * Sonido 100% procedural (Web Audio, sin archivos): viento, pájaros, pasos y rueda libre
 * de la bici. Arranca con el primer gesto del usuario (política de autoplay). Tecla K: mute.
 */
export class AudioSystem implements GameSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wind: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private stepTimer = 0;
  private tickTimer = 0;
  private muted = false;

  constructor(private readonly inputs: AudioInputs) {
    const start = (): void => this.start();
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('keydown', start, { once: true });
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'KeyK' || !this.master || !this.ctx) return;
      this.muted = !this.muted;
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.6, this.ctx.currentTime, 0.1);
    });
  }

  private start(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // Viento: ruido filtrado pasa-bajos con un LFO lento en el corte.
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(lp.frequency);
    this.wind = ctx.createGain();
    this.wind.gain.value = 0.08;
    src.connect(lp).connect(this.wind).connect(this.master);
    src.start();
    lfo.start();
  }

  private burst(freq: number, q: number, dur: number, gain: number): void {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp).connect(g).connect(this.master!);
    s.start(t, Math.random(), dur + 0.05);
  }

  private chirp(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const notes = 2 + Math.floor(Math.random() * 4);
    const base = 2400 + Math.random() * 1800;
    for (let i = 0; i < notes; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = t + i * (0.09 + Math.random() * 0.05);
      o.frequency.setValueAtTime(base, t0);
      o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.4), t0 + 0.07);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.025, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
      o.connect(g).connect(this.master!);
      o.start(t0);
      o.stop(t0 + 0.1);
    }
  }

  update(dt: number): void {
    if (!this.ctx || this.ctx.state !== 'running' || !this.master) return;
    const speed = this.inputs.speed();
    const night = this.inputs.night();
    this.wind?.gain.setTargetAtTime(0.05 + 0.05 * (1 - night), this.ctx.currentTime, 1);
    if (Math.random() < birdChance(night) * dt) this.chirp();
    if (this.inputs.riding()) {
      // Rueda libre: "tic" del trinquete proporcional a la velocidad.
      this.tickTimer -= dt;
      if (speed > 0.5 && this.tickTimer <= 0) {
        this.burst(5200, 18, 0.025, 0.05);
        this.tickTimer = 0.9 / speed;
      }
      return;
    }
    this.stepTimer -= dt;
    const interval = stepInterval(speed);
    if (this.stepTimer <= 0 && Number.isFinite(interval)) {
      this.burst(260 + Math.random() * 120, 1.2, 0.09, 0.22);
      this.burst(1800, 2, 0.04, 0.04);
      this.stepTimer = interval;
    }
  }
}
