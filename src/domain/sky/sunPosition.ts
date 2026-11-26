export interface SunState {
  /** Elevación sobre el horizonte (rad). */
  readonly elevation: number;
  /** Azimut desde el Norte, sentido horario (rad). */
  readonly azimuth: number;
  /** Dirección unitaria hacia el sol en ejes del mundo (X=Este, Y=Arriba, Z=Sur). */
  readonly direction: { readonly x: number; readonly y: number; readonly z: number };
}

const RAD = Math.PI / 180;

/**
 * Posición solar aproximada (SKY-1) a partir de la hora solar local (0–24),
 * la latitud y el día del año. Precisión ~1°, suficiente para iluminación.
 */
export function sunPosition(hour: number, latitudeDeg: number, dayOfYear = 80): SunState {
  const decl = -23.44 * RAD * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
  const phi = latitudeDeg * RAD;
  const h = (hour - 12) * 15 * RAD;
  const sinEl = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(h);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinEl)));
  const azimuth = Math.atan2(-Math.sin(h), Math.tan(decl) * Math.cos(phi) - Math.sin(phi) * Math.cos(h));
  const ce = Math.cos(elevation);
  return {
    elevation,
    azimuth: (azimuth + 2 * Math.PI) % (2 * Math.PI),
    direction: { x: Math.sin(azimuth) * ce, y: Math.sin(elevation), z: -Math.cos(azimuth) * ce },
  };
}

export interface LightingMix {
  /** 0..1 intensidad relativa del sol. */
  readonly sun: number;
  /** 0..1 cuánto "de noche" es (farolas, ventanas encendidas, luna). */
  readonly night: number;
  /** 0..1 tono cálido de amanecer/atardecer. */
  readonly golden: number;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** SKY-2/3: mezcla de iluminación según la elevación solar. */
export function lightingForElevation(elevation: number): LightingMix {
  return {
    sun: smooth(-0.02, 0.12, elevation),
    night: 1 - smooth(-0.2, 0.02, elevation),
    golden: smooth(-0.05, 0.05, elevation) * (1 - smooth(0.1, 0.45, elevation)),
  };
}
