import { el } from './dom';

/** Atribución obligatoria ODbL de OpenStreetMap y créditos (siempre visible). */
export function mountAttribution(parent: HTMLElement, extra: string): void {
  const link = el('a', { text: '© OpenStreetMap contributors', attrs: { href: 'https://www.openstreetmap.org/copyright', target: '_blank', rel: 'noopener' } });
  parent.appendChild(el('div', { className: 'attribution' }, [link, document.createTextNode(` · ${extra}`)]));
}
