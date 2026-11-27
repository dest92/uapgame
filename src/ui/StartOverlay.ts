import { el } from './dom';

const CONTROLS_DESKTOP: readonly [string, string][] = [
  ['WASD', 'caminar'], ['Shift', 'correr'], ['Espacio', 'saltar'], ['Mouse', 'mirar (click)'],
  ['E', 'entrar a un edificio'], ['F', 'subir/bajar de la bici'], ['B', 'aparecer una bici'],
  ['N', 'mapa'], ['M', 'ajustes / hora'], ['K', 'sonido'],
];
const CONTROLS_TOUCH: readonly [string, string][] = [
  ['Joystick', 'caminar'], ['Arrastrar', 'mirar'], ['Saltar / Correr', 'botones'], ['E', 'entrar'], ['Bici', 'subir/bajar'],
];

/** Pantalla de inicio con controles; el primer click habilita audio y puntero. */
export function showStartOverlay(parent: HTMLElement, touch: boolean): void {
  const list = (touch ? CONTROLS_TOUCH : CONTROLS_DESKTOP).flatMap(([k, v]) => [el('kbd', { text: k }), el('span', { text: v })]);
  const root = el('div', { className: 'start' }, [
    el('div', { className: 'start__card glass' }, [
      el('div', { className: 'loading__kicker', text: 'Ache Systems presenta' }),
      el('h1', { className: 'start__title', text: 'Campus UAP' }),
      el('p', { className: 'start__lead', text: 'Recorré la Universidad Adventista del Plata. Empezás frente al Pórtico: tenés una bici al lado.' }),
      el('div', { className: 'start__controls' }, list),
      el('button', { className: 'start__go', text: touch ? 'Tocar para empezar' : 'Click para empezar', attrs: { type: 'button' } }),
    ]),
  ]);
  root.addEventListener('click', () => {
    root.classList.add('start--out');
    setTimeout(() => root.remove(), 500);
  });
  parent.appendChild(root);
}
