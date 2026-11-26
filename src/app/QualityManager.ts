import type { PerspectiveCamera, Scene, WebGPURenderer } from 'three/webgpu';
import { QUALITY_PROFILES, QualityStore, defaultQuality, type QualityLevel, type QualityProfile } from '../domain/quality/QualityProfiles';
import { createPostPipeline } from '../render/post/PostPipeline';
import type { RenderSystem } from '../render/RenderSystem';
import type { SkySystem } from '../render/sky/SkySystem';

/** Alguien que reacciona a cambios de calidad (QLT-1). */
export interface QualityAware {
  applyQuality(q: QualityProfile): void;
}

/** Aplica y persiste el perfil de calidad en todos los subsistemas (QLT-1..3). */
export class QualityManager {
  private readonly store = new QualityStore(window.localStorage);
  private current: QualityProfile;
  private readonly listeners: QualityAware[] = [];

  constructor(
    private readonly deps: { renderer: WebGPURenderer; scene: Scene; camera: PerspectiveCamera; render: RenderSystem; sky: SkySystem },
  ) {
    const forced = new URLSearchParams(location.search).get('quality');
    const level = (forced && forced in QUALITY_PROFILES ? forced : null) as QualityLevel | null;
    this.current = QUALITY_PROFILES[level ?? this.store.load() ?? defaultQuality({
      touch: matchMedia('(pointer: coarse)').matches,
      mobileUA: /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent),
      cores: navigator.hardwareConcurrency ?? 4,
    })];
  }

  get profile(): QualityProfile {
    return this.current;
  }

  subscribe(l: QualityAware): void {
    this.listeners.push(l);
  }

  apply(level: QualityLevel = this.current.level, persist = false): void {
    const q = QUALITY_PROFILES[level];
    this.current = q;
    const { renderer, scene, camera, render, sky } = this.deps;
    render.setResolution(q.pixelRatioCap, q.renderScale);
    sky.setQuality(q);
    render.setPresenter(createPostPipeline(renderer, scene, camera, q));
    for (const l of this.listeners) l.applyQuality(q);
    if (persist) this.store.save(level);
  }
}
