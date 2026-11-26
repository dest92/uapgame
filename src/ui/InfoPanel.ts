import type { BuildingInfo, BuildingInfoFile } from '@shared/info/types';
import type { EventBus } from '../core/events/EventBus';
import type { GameEvents } from '../core/events/GameEvents';
import { el } from './dom';

const isUrl = (s: string): boolean => /^https?:\/\//.test(s);

/** INT-3/5: panel con la información del edificio y el origen de cada dato. */
export class InfoPanel {
  private readonly root: HTMLElement;
  private readonly body: HTMLElement;

  constructor(parent: HTMLElement, bus: EventBus<GameEvents>, private readonly info: BuildingInfoFile) {
    this.body = el('div', { className: 'panel__body' });
    const close = el('button', { className: 'panel__close', text: '×', attrs: { type: 'button', 'aria-label': 'Cerrar' } });
    close.addEventListener('click', () => bus.emit('interaction:close', undefined));
    this.root = el('aside', { className: 'panel glass', attrs: { role: 'dialog', 'aria-modal': 'false' } }, [close, this.body]);
    parent.appendChild(this.root);
    bus.on('interaction:open', ({ buildingId }) => this.show(buildingId));
    bus.on('interaction:close', () => this.root.classList.remove('panel--open'));
  }

  private show(id: string): void {
    const b = this.info.buildings[id];
    this.body.replaceChildren(...(b ? this.render(id, b) : [el('p', { text: `Sin información para ${id}.` })]));
    this.root.classList.add('panel--open');
  }

  private render(id: string, b: BuildingInfo): HTMLElement[] {
    const source = (s: string): HTMLElement =>
      isUrl(s.split(' ')[0]!) ? el('a', { className: 'panel__src', text: 'fuente', attrs: { href: s.split(' ')[0]!, target: '_blank', rel: 'noopener' } })
        : el('span', { className: 'panel__src', text: s });
    const nodes: HTMLElement[] = [
      el('div', { className: 'panel__kicker', text: 'Universidad Adventista del Plata' }),
      el('h2', { className: 'panel__title', text: b.name.value ?? id }),
    ];
    nodes.push(b.description.value
      ? el('p', { className: 'panel__desc' }, [document.createTextNode(b.description.value + ' '), source(b.description.source ?? '')])
      : el('p', { className: 'panel__desc panel__desc--empty', text: 'Todavía no hay una descripción verificada para este edificio.' }));
    if (b.fields.length) {
      nodes.push(el('dl', { className: 'panel__fields' }, b.fields.flatMap((f) => [
        el('dt', { text: f.label }),
        el('dd', {}, [document.createTextNode(f.value + ' '), source(f.source)]),
      ])));
    }
    nodes.push(el('div', { className: 'panel__foot', text: `Datos: ${b.name.source ?? 'OSM'} · © OpenStreetMap contributors` }));
    return nodes;
  }
}
