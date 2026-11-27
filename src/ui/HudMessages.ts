import type { EventBus } from '../core/events/EventBus';
import type { GameEvents } from '../core/events/GameEvents';
import { el } from './dom';

/** Ayuda contextual persistente y avisos breves (toasts). */
export function mountHudMessages(parent: HTMLElement, bus: EventBus<GameEvents>): void {
  const hint = el('div', { className: 'ctxhint glass' });
  hint.hidden = true;
  const toasts = el('div', { className: 'toasts', attrs: { 'aria-live': 'polite' } });
  parent.append(hint, toasts);
  bus.on('hud:hint', (text) => {
    hint.hidden = !text;
    hint.textContent = text ?? '';
  });
  bus.on('hud:toast', (text) => {
    const t = el('div', { className: 'toast glass', text });
    toasts.appendChild(t);
    setTimeout(() => t.classList.add('toast--out'), 3200);
    setTimeout(() => t.remove(), 3800);
  });
}
