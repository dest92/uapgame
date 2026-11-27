import type { Vec2 } from '@shared/geo/types';
import type { WorldData } from '@shared/world/types';
import { el } from './dom';
import { bakeCampusMap } from './mapRaster';

const PX_PER_M = 1.2;

/** Mapa grande del campus (tecla N): nombres, jugador y edificios del objetivo. */
export class CampusMap {
  private readonly root: HTMLElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly base: HTMLCanvasElement;

  constructor(parent: HTMLElement, private readonly world: WorldData, private readonly highlight: () => readonly string[]) {
    this.base = bakeCampusMap(world, PX_PER_M);
    const canvas = el('canvas', { className: 'campusmap__canvas', attrs: { width: String(this.base.width), height: String(this.base.height) } });
    this.ctx = canvas.getContext('2d')!;
    this.root = el('div', { className: 'campusmap glass' }, [el('div', { className: 'campusmap__title', text: 'Mapa del campus · N para cerrar' }), canvas]);
    this.root.hidden = true;
    parent.appendChild(this.root);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyN' && !(e.target instanceof HTMLInputElement)) this.root.hidden = !this.root.hidden;
    });
  }

  get open(): boolean {
    return !this.root.hidden;
  }

  update(player: Vec2, heading: number): void {
    if (this.root.hidden) return;
    const g = this.ctx;
    const { bounds } = this.world;
    const px = (p: Vec2): [number, number] => [(p.x - bounds.minX) * PX_PER_M, (p.z - bounds.minZ) * PX_PER_M];
    g.drawImage(this.base, 0, 0);
    const targets = new Set(this.highlight());
    g.font = '600 11px Inter, system-ui, sans-serif';
    g.textAlign = 'center';
    for (const b of this.world.buildings.filter((x) => x.identified)) {
      const [x, y] = px(b.centroid);
      const hot = targets.has(b.id);
      g.fillStyle = hot ? '#f5b942' : 'rgba(20,24,30,.85)';
      g.strokeStyle = hot ? 'rgba(0,0,0,.6)' : 'rgba(255,255,255,.7)';
      g.lineWidth = 3;
      const label = b.name.length > 28 ? `${b.name.slice(0, 26)}…` : b.name;
      g.strokeText(label, x, y);
      g.fillText(label, x, y);
    }
    const [x, y] = px(player);
    g.save();
    g.translate(x, y);
    g.rotate(Math.PI - heading);
    g.fillStyle = '#f5b942';
    g.beginPath();
    g.moveTo(0, -10);
    g.lineTo(7, 8);
    g.lineTo(-7, 8);
    g.closePath();
    g.fill();
    g.restore();
  }
}
