import type { Vec2 } from '@shared/geo/types';
import type { WorldData } from '@shared/world/types';
import { el } from './dom';
import { bakeCampusMap } from './mapRaster';

const SIZE = 168;
const VIEW_PX_PER_M = 1.1;
const BAKE_PX_PER_M = 1.5;

/**
 * MAP-1/2: el mapa se rasteriza una sola vez desde world.json en un canvas
 * offscreen; cada frame solo se copia rotado y centrado en el jugador.
 */
export class Minimap {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly baked: HTMLCanvasElement;
  private readonly north: HTMLElement;

  constructor(parent: HTMLElement, private readonly world: WorldData) {
    const canvas = el('canvas', { className: 'minimap__canvas', attrs: { width: String(SIZE * 2), height: String(SIZE * 2) } });
    this.north = el('div', { className: 'minimap__north', text: 'N' });
    parent.appendChild(el('div', { className: 'minimap glass', attrs: { 'aria-label': 'Minimapa' } }, [canvas, el('div', { className: 'minimap__player' }), this.north]));
    this.ctx = canvas.getContext('2d')!;
    this.baked = bakeCampusMap(world, BAKE_PX_PER_M);
  }

  /** `heading` = yaw de la cámara: el mapa rota para que "adelante" quede arriba. */
  update(player: Vec2, heading: number): void {
    const g = this.ctx;
    const s = SIZE * 2;
    const k = VIEW_PX_PER_M / BAKE_PX_PER_M * 2;
    const { bounds } = this.world;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, s, s);
    g.translate(s / 2, s / 2);
    g.rotate(heading);
    g.scale(k, k);
    g.translate(-(player.x - bounds.minX) * BAKE_PX_PER_M, -(player.z - bounds.minZ) * BAKE_PX_PER_M);
    g.drawImage(this.baked, 0, 0);
    this.north.style.transform = `rotate(${heading}rad) translateY(-${SIZE / 2 - 10}px) rotate(${-heading}rad)`;
  }
}
