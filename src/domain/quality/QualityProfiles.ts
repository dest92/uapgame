export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualityProfile {
  readonly level: QualityLevel;
  readonly pixelRatioCap: number;
  /** Escala de resolución interna (1 = nativa). */
  readonly renderScale: number;
  readonly shadows: boolean;
  readonly shadowMapSize: number;
  readonly cascades: number;
  readonly shadowDistance: number;
  readonly ao: boolean;
  readonly bloom: boolean;
  readonly antialias: boolean;
  /** Matas de pasto por m² en áreas verdes. */
  readonly grassDensity: number;
  readonly grassDistance: number;
  readonly treeFillSpacing: number;
}

export const QUALITY_PROFILES: Readonly<Record<QualityLevel, QualityProfile>> = {
  low: {
    level: 'low', pixelRatioCap: 1, renderScale: 0.75, shadows: true, shadowMapSize: 1024, cascades: 1,
    shadowDistance: 60, ao: false, bloom: false, antialias: false, grassDensity: 1.5, grassDistance: 30, treeFillSpacing: 14,
  },
  medium: {
    level: 'medium', pixelRatioCap: 1.5, renderScale: 1, shadows: true, shadowMapSize: 2048, cascades: 3,
    shadowDistance: 160, ao: true, bloom: true, antialias: true, grassDensity: 4, grassDistance: 50, treeFillSpacing: 10,
  },
  high: {
    level: 'high', pixelRatioCap: 2, renderScale: 1, shadows: true, shadowMapSize: 4096, cascades: 4,
    shadowDistance: 260, ao: true, bloom: true, antialias: true, grassDensity: 8, grassDistance: 80, treeFillSpacing: 8,
  },
};

export interface DeviceHints {
  readonly touch: boolean;
  readonly mobileUA: boolean;
  readonly cores: number;
}

export function defaultQuality(d: DeviceHints): QualityLevel {
  if (d.mobileUA || (d.touch && d.cores <= 8)) return 'low';
  return 'medium';
}

const isLevel = (v: unknown): v is QualityLevel => v === 'low' || v === 'medium' || v === 'high';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Persistencia tolerante a fallos (modo privado, cookies bloqueadas…). QLT-3. */
export class QualityStore {
  private static readonly KEY = 'uap.quality';
  constructor(private readonly storage: KeyValueStorage) {}

  load(): QualityLevel | null {
    try {
      const v = this.storage.getItem(QualityStore.KEY);
      return isLevel(v) ? v : null;
    } catch {
      return null;
    }
  }

  save(level: QualityLevel): void {
    try {
      this.storage.setItem(QualityStore.KEY, level);
    } catch {
      /* sin persistencia: no es crítico */
    }
  }
}
