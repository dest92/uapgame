import type { EventBus } from '../core/events/EventBus';
import type { GameEvents } from '../core/events/GameEvents';
import type { QualityLevel } from '../domain/quality/QualityProfiles';
import { el } from './dom';

const LABELS: Readonly<Record<QualityLevel, string>> = { low: 'Baja', medium: 'Media', high: 'Alta' };

const fmtHour = (h: number): string => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;

/** Menú de ajustes (botón ⚙ / tecla M): calidad (QLT-1) y hora del día (SKY-2). */
export class SettingsMenu {
  private readonly root: HTMLElement;

  constructor(parent: HTMLElement, bus: EventBus<GameEvents>, initial: { quality: QualityLevel; hour: number; backend: string }) {
    const select = el('select', { className: 'menu__select', attrs: { 'aria-label': 'Calidad gráfica' } },
      (['low', 'medium', 'high'] as const).map((q) => el('option', { text: LABELS[q], attrs: { value: q } })));
    select.value = initial.quality;
    select.addEventListener('change', () => bus.emit('settings:quality', select.value as QualityLevel));

    const hourLabel = el('span', { className: 'menu__value', text: fmtHour(initial.hour) });
    const slider = el('input', { className: 'menu__range', attrs: { type: 'range', min: '0', max: '24', step: '0.05', value: String(initial.hour), 'aria-label': 'Hora del día' } });
    slider.addEventListener('input', () => {
      const h = Number(slider.value);
      hourLabel.textContent = fmtHour(h);
      bus.emit('settings:timeOfDay', h);
    });

    const toggle = el('button', { className: 'menu__toggle glass', text: '⚙', attrs: { type: 'button', 'aria-label': 'Ajustes' } });
    this.root = el('div', { className: 'menu glass' }, [
      el('div', { className: 'menu__title', text: 'Ajustes' }),
      el('label', { className: 'menu__row' }, [el('span', { text: 'Calidad' }), select]),
      el('label', { className: 'menu__row' }, [el('span', { text: 'Hora del día' }), hourLabel]),
      slider,
      el('div', { className: 'menu__meta', text: `Render: ${initial.backend} · F3: estadísticas` }),
    ]);
    toggle.addEventListener('click', () => this.root.classList.toggle('menu--open'));
    parent.append(toggle, this.root);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && !(e.target instanceof HTMLInputElement)) this.root.classList.toggle('menu--open');
    });
  }
}
