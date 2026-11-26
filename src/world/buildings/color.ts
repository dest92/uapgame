/** '#rrggbb' sRGB → RGB lineal (para atributos de color en shaders lineales). */
export function hexToLinear(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  const c = (v: number): number => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return [c((n >> 16) & 255), c((n >> 8) & 255), c(n & 255)];
}
