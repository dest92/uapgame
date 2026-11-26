import { CanvasTexture, SRGBColorSpace } from 'three/webgpu';
import { mulberry32 } from '../../domain/vegetation/scatter';

export type FoliageKind = 'broadleaf' | 'conifer' | 'palm';

/**
 * Texturas de follaje generadas en runtime (sin descarga): racimos de hojas,
 * agujas o frondas sobre fondo transparente, para tarjetas alpha-testeadas.
 */
export function createFoliageTexture(kind: FoliageKind, size = 256): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const rand = mulberry32(kind.length * 977);
  const greens = kind === 'conifer' ? ['#2f4a2a', '#36552f', '#253f24', '#3e5d33'] : ['#4a6b2c', '#5b7d33', '#3d5c26', '#6b8a3c', '#56772f'];
  const pick = (): string => greens[Math.floor(rand() * greens.length)]!;

  if (kind === 'palm') {
    // Fronda: raquis central con folíolos colgantes.
    g.strokeStyle = '#6d6a3a';
    g.lineWidth = size * 0.02;
    g.beginPath();
    g.moveTo(size * 0.5, size);
    g.quadraticCurveTo(size * 0.52, size * 0.5, size * 0.5, 0);
    g.stroke();
    for (let y = size * 0.04; y < size * 0.98; y += size * 0.022) {
      const len = size * 0.45 * Math.sin((y / size) * Math.PI) + size * 0.05;
      for (const s of [-1, 1]) {
        g.strokeStyle = pick();
        g.lineWidth = size * 0.012;
        g.beginPath();
        g.moveTo(size * 0.5, y);
        g.quadraticCurveTo(size * 0.5 + s * len * 0.6, y + len * 0.15, size * 0.5 + s * len, y + len * 0.45);
        g.stroke();
      }
    }
  } else {
    const count = kind === 'conifer' ? 900 : 420;
    for (let i = 0; i < count; i++) {
      // Distribución radial densa al centro, rala en el borde (silueta orgánica).
      const r = Math.sqrt(rand()) * size * 0.46;
      const a = rand() * Math.PI * 2;
      const x = size / 2 + Math.cos(a) * r;
      const y = size / 2 + Math.sin(a) * r;
      g.save();
      g.translate(x, y);
      g.rotate(rand() * Math.PI * 2);
      g.fillStyle = pick();
      g.globalAlpha = 0.9 + rand() * 0.1;
      g.beginPath();
      if (kind === 'conifer') g.ellipse(0, 0, size * 0.035, size * 0.005, 0, 0, Math.PI * 2);
      else g.ellipse(0, 0, size * 0.03, size * 0.016, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.generateMipmaps = true;
  return t;
}
