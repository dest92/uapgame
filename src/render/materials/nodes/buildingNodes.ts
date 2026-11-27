import {
  abs, attribute, color, cross, dFdx, dFdy, dot, float, floor, fract, fwidth, hash, luminance, max, min, mix, mx_noise_float,
  normalMap, normalView, normalWorldGeometry, normalize, positionView, positionWorld, sign, sin, smoothstep, step, texture, uv, vec2, vec3, vertexColor, cos,
} from 'three/tsl';
import type { Node } from 'three/webgpu';
import type { PbrSet } from '../../textures/TextureLibrary';
import { sceneUniforms } from './sharedUniforms';

type F = Node<'float'>;
type V3 = Node<'vec3'>;

/**
 * Perturba una normal (espacio vista) con una altura procedural por derivadas de pantalla
 * (Mikkelsen, "Bump Mapping Unparametrized Surfaces on the GPU"). `h` en metros.
 */
export function bumpNormal(h: F, base: V3 = normalView): V3 {
  const sx = dFdx(positionView);
  const sy = dFdy(positionView);
  const r1 = cross(sy, base);
  const r2 = cross(base, sx);
  const det = dot(sx, r1);
  const grad = sign(det).mul(r1.mul(dFdx(h)).add(r2.mul(dFdy(h))));
  return normalize(abs(det).mul(base).sub(grad));
}

/**
 * Techos (ROOF-*): `facade.x` elige el material — 0 tejas (textura alineada a la pendiente),
 * 1 chapa acanalada procedural (onda de 7,6 cm con relieve, juntas de chapa, óxido), 2 membrana.
 * `facade.y = 1`: cenefa/borde de color liso.
 */
export function roofNodes2(tiles: PbrSet, concrete: PbrSet) {
  const f = attribute('facade', 'vec3');
  const isTiles = float(1).sub(step(0.5, f.x));
  const isMetal = step(0.5, f.x).mul(float(1).sub(step(1.5, f.x)));
  const isMembrane = step(1.5, f.x);
  const plain = step(0.5, f.y);
  const n = normalWorldGeometry;
  const slope2 = vec2(n.x, n.z);
  const sl = max(slope2.length(), 1e-4);
  const down = slope2.div(sl);
  const flatish = step(sl, 0.05);
  const across = vec2(down.y.negate(), down.x);
  const xz = positionWorld.xz;
  const ua = mix(dot(xz, across), xz.x, flatish);
  const va = mix(dot(xz, down).div(max(n.y, 0.3)), xz.y, flatish);
  const tint = vertexColor().rgb;

  // Tejas: textura orientada con la pendiente.
  const tuv = vec2(ua, va).div(2.2);
  const t = texture(tiles.color, tuv).rgb;
  const tileC = tint.mul(luminance(t).div(0.32)).mul(0.92);

  // Chapa acanalada.
  const PITCH = 0.076;
  const phase = ua.mul((Math.PI * 2) / PITCH);
  const fade = float(1).sub(smoothstep(0.02, 0.06, fwidth(ua)));
  const corr = cos(phase);
  const sp = fract(ua.div(1.1));
  const seam = float(1).sub(smoothstep(0, 0.025, min(sp, float(1).sub(sp)).mul(1.1))).mul(0.3).mul(fade);
  const panel = hash(floor(ua.div(1.1)).add(floor(va.div(6)).mul(17.3)));
  const rust = smoothstep(0.55, 0.85, mx_noise_float(vec3(ua.mul(1.2), va.mul(0.12), 3.1)).mul(0.5).add(0.5));
  const streak = smoothstep(0.4, 0.9, mx_noise_float(vec3(ua.mul(3.0), va.mul(0.25), 7.7)).mul(0.5).add(0.5));
  let metalC = tint.mul(mix(float(0.9), float(1.06), panel)).mul(float(1).add(corr.mul(0.06).mul(fade)));
  metalC = mix(metalC, metalC.mul(0.72), streak.mul(0.35));
  metalC = mix(metalC, vec3(0.36, 0.2, 0.12), rust.mul(0.35));
  metalC = metalC.mul(float(1).sub(seam));

  // Membrana / losa: concreto con manchas de agua.
  const cc = texture(concrete.color, xz.div(4)).rgb;
  const puddle = smoothstep(0.55, 0.8, mx_noise_float(vec3(xz.mul(0.18), 1.7)).mul(0.5).add(0.5));
  const memC = cc.mul(tint).mul(1.35).mul(mix(float(1), float(0.78), puddle));

  let c = tileC.mul(isTiles).add(metalC.mul(isMetal)).add(memC.mul(isMembrane));
  c = mix(c, tint, plain);
  const roughness = mix(
    texture(tiles.rough, tuv).g.mul(isTiles).add(mix(float(0.42), float(0.75), rust.add(streak.mul(0.4)).min(1)).mul(isMetal)).add(float(0.85).mul(isMembrane)),
    float(0.6), plain,
  );
  const metalness = isMetal.mul(float(1).sub(plain)).mul(mix(float(0.55), float(0.15), rust));
  const tileN = normalMap(texture(tiles.normal, tuv));
  const base = mix(normalView, tileN, isTiles.mul(float(1).sub(plain)));
  const corrH = corr.mul(0.012).mul(fade).mul(isMetal).mul(float(1).sub(plain));
  return { color: c, roughness, metalness, normal: bumpNormal(corrH, normalize(base)) };
}

/** Molduras, marcos, alféizares y zócalos: color por vértice sobre grano de hormigón. */
export function trimNodes(concrete: PbrSet) {
  const tuv = uv().div(1.6);
  const tex = texture(concrete.color, tuv).rgb;
  const grain = luminance(tex).div(0.42).clamp(0.6, 1.4);
  const dirt = smoothstep(0.45, 0.85, mx_noise_float(positionWorld.mul(vec3(0.6, 1.8, 0.6))).mul(0.5).add(0.5));
  const c = vertexColor().rgb.mul(mix(float(1), grain, 0.35)).mul(mix(float(1), float(0.8), dirt));
  return { color: c, roughness: float(0.72), normal: normalMap(texture(concrete.normal, tuv)) };
}

/**
 * Vidrio (FAC-2): reflejo del cielo por Fresnel + interior falso (cortinas, fondo oscuro
 * con gradiente) y luz cálida de noche en la mitad de las ventanas y en las puertas.
 */
export function glassNodes() {
  const seed = vertexColor().r;
  const isDoor = vertexColor().g;
  const p = uv();
  const edge = min(min(p.x, float(1).sub(p.x)), min(p.y, float(1).sub(p.y)));
  const depthShade = mix(float(0.55), float(1), smoothstep(0, 0.25, edge));
  const room = mix(color('#121820'), color('#2a2622'), hash(seed.mul(31.7))).mul(depthShade);
  const curtainOn = step(0.58, hash(seed.mul(57.3)));
  const curtainH = mix(float(0.35), float(1), hash(seed.mul(13.1)));
  const fold = sin(p.x.mul(40).add(seed.mul(10))).mul(0.08).add(0.92);
  const curtain = curtainOn.mul(step(float(1).sub(curtainH), p.y));
  const fabric = mix(color('#b9ab90'), color('#6f7c86'), hash(seed.mul(7.3))).mul(fold).mul(0.6);
  const c = mix(room, fabric, curtain);
  const lit = max(step(0.5, seed), isDoor).mul(sceneUniforms.night);
  const warm = mix(vec3(1.0, 0.74, 0.45), vec3(0.9, 0.93, 1.0), hash(seed.mul(91.7)).mul(0.7));
  const emissive = warm.mul(lit).mul(mix(float(1.6), float(2.6), curtain)).mul(depthShade);
  return { color: c, roughness: mix(float(0.04), float(0.1), hash(seed.mul(3.3))), metalness: float(0.1), emissive };
}
