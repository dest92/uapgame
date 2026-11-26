import type { EventBus } from '../core/events/EventBus';
import type { GameEvents } from '../core/events/GameEvents';
import { el } from './dom';

/** INT-2: "E — Ver <nombre>" (o tocar en pantallas táctiles). */
export class InteractionHint {
  private readonly root: HTMLButtonElement;
  private readonly name: HTMLElement;

  constructor(parent: HTMLElement, bus: EventBus<GameEvents>, touch: boolean) {
    this.name = el('span', { className: 'hint__name' });
    this.root = el('button', { className: 'hint glass', attrs: { type: 'button', 'aria-live': 'polite' } }, [
      el('kbd', { className: 'hint__key', text: touch ? 'Tocar' : 'E' }),
      el('span', { className: 'hint__verb', text: 'Ver' }),
      this.name,
    ]);
    this.root.addEventListener('click', () => bus.emit('interaction:request', undefined));
    parent.appendChild(this.root);
    bus.on('interaction:target', (t) => {
      this.root.classList.toggle('hint--visible', !!t);
      if (t) this.name.textContent = t.name;
    });
    bus.on('interaction:open', () => this.root.classList.remove('hint--visible'));
  }
}
