import type { WebGPURenderer } from 'three/webgpu';
import type { GameSystem } from '../core/loop/GameLoop';
import type { SceneContext } from './scene/SceneContext';

/** Estrategia de presentación: render directo o pipeline de post-procesado. */
export interface FramePresenter {
  render(): void;
}

/** Ajusta tamaño y presenta cada frame. Último sistema del loop. */
export class RenderSystem implements GameSystem {
  private presenter: FramePresenter;
  private pixelRatioCap = 1.5;
  private renderScale = 1;

  constructor(
    private readonly renderer: WebGPURenderer,
    private readonly ctx: SceneContext,
    private readonly container: HTMLElement,
  ) {
    this.presenter = { render: () => this.renderer.render(this.ctx.scene, this.ctx.camera) };
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  setPresenter(p: FramePresenter): void {
    this.presenter = p;
  }

  setResolution(pixelRatioCap: number, renderScale: number): void {
    this.pixelRatioCap = pixelRatioCap;
    this.renderScale = renderScale;
    this.resize();
  }

  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.pixelRatioCap) * this.renderScale);
    this.renderer.setSize(w, h, false);
    this.ctx.resize(w, h);
  }

  update(): void {
    this.presenter.render();
  }
}
