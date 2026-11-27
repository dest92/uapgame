import { float, luminance, mix, mx_noise_float, normalMap, normalWorld, positionWorld, smoothstep, step, texture, uv, vec2, vertexColor, color, abs, fract } from 'three/tsl';
import type { Node, Texture } from 'three/webgpu';
import type { PbrSet } from '../../textures/TextureLibrary';


/** Muestreo con dos escalas y ruido de mezcla para ocultar la repetición (anti-tiling barato). */
function detiled(set: PbrSet, xz: Node<'vec2'>, tile: number) {
  const a = xz.div(tile);
  const b = xz.div(tile * 2.7).add(vec2(0.37, 0.71));
  const m = smoothstep(0.35, 0.65, mx_noise_float(xz.mul(0.035)).mul(0.5).add(0.5));
  return {
    color: mix(texture(set.color, a).rgb, texture(set.color, b).rgb, m),
    rough: mix(texture(set.rough, a).g, texture(set.rough, b).g, m),
    normal: texture(set.normal, a),
  };
}

/**
 * Suelo (VEG/MAT): mezcla césped / pasto silvestre / tierra / pavimento según el
 * splat map pintado desde OSM. UV en espacio mundo.
 */
export function groundNodes(sets: { grass: PbrSet; dirt: PbrSet; paving: PbrSet }, splat: Texture) {
  const xz = positionWorld.xz;
  const s = texture(splat, uv());
  const grass = detiled(sets.grass, xz, 3.5);
  const dirt = detiled(sets.dirt, xz, 4);
  const paved = detiled(sets.paving, xz, 3);
  const macro = mx_noise_float(xz.mul(0.012)).mul(0.5).add(0.5);
  // Pasto silvestre: el mismo césped, más seco y amarillento, con manchas.
  const wild = grass.color.mul(color('#a08f60')).mul(mix(float(0.85), float(1.15), macro));
  const lawn = grass.color.mul(mix(float(0.75), float(0.95), macro)).mul(color('#9fb586'));
  let c = mix(wild, lawn, s.r);
  c = mix(c, dirt.color, s.g.mul(float(1).sub(s.b)));
  c = mix(c, paved.color, s.b);
  let r = mix(grass.rough, dirt.rough, s.g);
  r = mix(r, paved.rough, s.b);
  const n = normalMap(paved.normal).mul(s.b).add(normalMap(grass.normal).mul(float(1).sub(s.b)));
  return { color: c, roughness: r.mul(1.05).clamp(0.4, 1), normal: n.normalize() };
}

/**
 * Calzada/senderos (ROAD-1): asfalto o adoquín según el tinte del vértice,
 * con línea central discontinua en calles. UV: u lateral (m), v longitudinal (m).
 */
export function roadNodes(asphalt: PbrSet, paving: PbrSet) {
  const isPaved = step(0.12, luminance(vertexColor().rgb));
  const tuvA = vec2(uv().x, uv().y).div(5);
  const tuvP = vec2(uv().x, uv().y).div(2.2);
  const a = texture(asphalt.color, tuvA).rgb.mul(0.85);
  const p = texture(paving.color, tuvP).rgb.mul(vertexColor().rgb.div(0.36));
  const line = step(abs(uv().x), 0.07).mul(step(fract(uv().y.div(7)), 0.5)).mul(float(1).sub(isPaved));
  const wear = mx_noise_float(positionWorld.xz.mul(0.08)).mul(0.12).add(0.94);
  const c = mix(a.mul(wear), p, isPaved);
  return {
    color: mix(c, color('#e8e4da'), line.mul(0.85)),
    roughness: mix(texture(asphalt.rough, tuvA).g, texture(paving.rough, tuvP).g, isPaved),
    normal: normalMap(texture(asphalt.normal, tuvA)).mul(float(1).sub(isPaved)).add(normalMap(texture(paving.normal, tuvP)).mul(isPaved)).normalize(),
  };
}

/** Techos: tejas en faldones inclinados, losa/membrana en techos planos. UV = mundo xz. */
export function roofNodes(tiles: PbrSet, concrete: PbrSet) {
  const pitched = step(normalWorld.y, 0.97);
  const xz = positionWorld.xz;
  const t = texture(tiles.color, xz.div(3)).rgb;
  const cc = texture(concrete.color, xz.div(4)).rgb;
  const tint = vertexColor().rgb;
  const tileC = tint.mul(luminance(t).div(0.32)).mul(0.9);
  const flatC = cc.mul(color('#9a9890')).mul(mix(float(0.8), float(1.1), mx_noise_float(xz.mul(0.2)).mul(0.5).add(0.5)));
  return {
    color: mix(flatC, tileC, pitched),
    roughness: mix(texture(concrete.rough, xz.div(4)).g, texture(tiles.rough, xz.div(3)).g, pitched),
    normal: normalMap(texture(tiles.normal, xz.div(3))).mul(pitched).add(normalMap(texture(concrete.normal, xz.div(4))).mul(float(1).sub(pitched))).normalize(),
  };
}
