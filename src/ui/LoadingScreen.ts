import { el } from './dom';

/** Pantalla de carga con progreso por etapas (PERF-3) y errores legibles (RND-4). */
export class LoadingScreen {
  private readonly root: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly label: HTMLElement;

  constructor(parent: HTMLElement) {
    this.bar = el('div', { className: 'loading__bar-fill' });
    this.label = el('div', { className: 'loading__label', text: 'Preparando…' });
    this.root = el('div', { className: 'loading' }, [
      el('div', { className: 'loading__brand' }, [
        el('div', { className: 'loading__kicker', text: 'Ache Systems presenta' }),
        el('h1', { className: 'loading__title', text: 'Campus UAP' }),
        el('div', { className: 'loading__subtitle', text: 'Universidad Adventista del Plata · Libertador San Martín, Entre Ríos' }),
      ]),
      el('div', { className: 'loading__bar' }, [this.bar]),
      this.label,
    ]);
    parent.appendChild(this.root);
  }

  progress(stage: string, value: number): void {
    this.bar.style.transform = `scaleX(${Math.max(0, Math.min(1, value))})`;
    this.label.textContent = stage;
  }

  error(message: string): void {
    this.root.classList.add('loading--error');
    document.documentElement.dataset['ready'] = 'error';
    this.label.textContent = message;
  }

  hide(): void {
    this.root.classList.add('loading--done');
    document.documentElement.dataset['ready'] = '1';
    setTimeout(() => this.root.remove(), 900);
  }
}
