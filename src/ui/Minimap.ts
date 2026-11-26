import type { Vec2 } from '@shared/geo/types';
import type { WorldData } from '@shared/world/types';
import { el } from './dom';

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
    this.baked = this.bake();
  }

  private bake(): HTMLCanvasElement {
    const { bounds } = this.world;
    const c = document.createElement('canvas');
    c.width = Math.ceil((bounds.maxX - bounds.minX) * BAKE_PX_PER_M);
    c.height = Math.ceil((bounds.maxZ - bounds.minZ) * BAKE_PX_PER_M);
    const g = c.getContext('2d')!;
    const px = (p: Vec2): [number, number] => [(p.x - bounds.minX) * BAKE_PX_PER_M, (p.z - bounds.minZ) * BAKE_PX_PER_M];
    const path = (pts: readonly Vec2[], close: boolean): void => {
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(...px(p)) : g.moveTo(...px(p))));
      if (close) g.closePath();
    };
    g.fillStyle = '#26301f';
    g.fillRect(0, 0, c.width, c.height);
    const AREA: Record<string, string> = { park: '#3b5a2c', garden: '#3f6230', grass: '#34502a', pitch: '#3f7a35', water: '#2f6f8f', parking: '#4a4a48', plaza: '#5a5853', track: '#7a4a35', sports: '#3a5a32' };
    for (const a of this.world.areas) {
      path(a.polygon, true);
      g.fillStyle = AREA[a.kind] ?? '#34502a';
      g.fill();
    }
    path(this.world.campus.outline, true);
    g.strokeStyle = 'rgba(245,185,66,.55)';
    g.lineWidth = 2;
    g.setLineDash([6, 4]);
    g.stroke();
    g.setLineDash([]);
    g.lineCap = g.lineJoin = 'round';
    for (const r of this.world.roads) {
      path(r.points, false);
      g.strokeStyle = r.class === 'road' ? '#9a9a96' : '#c9c1ad';
      g.lineWidth = Math.max(1.2, r.width * BAKE_PX_PER_M * (r.class === 'road' ? 1 : 0.8));
      g.stroke();
    }
    for (const b of this.world.buildings) {
      path(b.footprint, true);
      g.fillStyle = b.identified ? '#e9e2d2' : '#b9b3a6';
      g.fill();
    }
    return c;
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
