import type { Vec2 } from '@shared/geo/types';
import type { WorldData } from '@shared/world/types';

/** Rasteriza el campus desde world.json (MAP-1). Compartido por minimapa y mapa grande. */
export function bakeCampusMap(world: WorldData, pxPerM: number): HTMLCanvasElement {
  const { bounds } = world;
  const c = document.createElement('canvas');
  c.width = Math.ceil((bounds.maxX - bounds.minX) * pxPerM);
  c.height = Math.ceil((bounds.maxZ - bounds.minZ) * pxPerM);
  const g = c.getContext('2d')!;
  const px = (p: Vec2): [number, number] => [(p.x - bounds.minX) * pxPerM, (p.z - bounds.minZ) * pxPerM];
  const path = (pts: readonly Vec2[], close: boolean): void => {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(...px(p)) : g.moveTo(...px(p))));
    if (close) g.closePath();
  };
  g.fillStyle = '#26301f';
  g.fillRect(0, 0, c.width, c.height);
  const AREA: Record<string, string> = { park: '#3b5a2c', garden: '#3f6230', grass: '#34502a', pitch: '#3f7a35', water: '#2f6f8f', parking: '#4a4a48', plaza: '#5a5853', track: '#7a4a35', sports: '#3a5a32' };
  for (const a of world.areas) {
    path(a.polygon, true);
    g.fillStyle = AREA[a.kind] ?? '#34502a';
    g.fill();
  }
  path(world.campus.outline, true);
  g.strokeStyle = 'rgba(245,185,66,.55)';
  g.lineWidth = 2;
  g.setLineDash([6, 4]);
  g.stroke();
  g.setLineDash([]);
  g.lineCap = g.lineJoin = 'round';
  for (const r of world.roads) {
    path(r.points, false);
    g.strokeStyle = r.class === 'road' ? '#9a9a96' : '#c9c1ad';
    g.lineWidth = Math.max(1.2, r.width * pxPerM * (r.class === 'road' ? 1 : 0.8));
    g.stroke();
  }
  for (const b of world.buildings) {
    path(b.footprint, true);
    g.fillStyle = b.identified ? '#e9e2d2' : '#b9b3a6';
    g.fill();
  }
  return c;
}

