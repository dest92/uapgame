import { attribute, float, floor, fract, hash, luminance, mix, normalMap, smoothstep, step, texture, uv, vec2, vec3, vertexColor, color, max, min, mx_noise_float, positionWorld } from 'three/tsl';
import type { Node } from 'three/webgpu';
import type { PbrSet } from '../../textures/TextureLibrary';
import { FACADE } from '@shared/world/facadeGrammar';
import { sceneUniforms } from './sharedUniforms';

type F = Node<'float'>;

// Misma grilla que la gramática de fachada (FAC-4): cerca y lejos coinciden.
const { LEVEL, BAY, WIN_W, SILL, HEAD, TOP_MARGIN, MIN_WALL } = FACADE;
const FRAME = 0.07;

export interface FacadeParams {
  /** Metros que cubre una repetición de la textura. */
  readonly tile: number;
  /** Cuánto del color original de la textura se conserva (0 = solo tinte). */
  readonly keepTexture: number;
  /** Luminancia media aproximada de la textura (para normalizar el tinte). */
  readonly textureLuma: number;
}

export interface FacadeNodes {
  readonly color: Node<'vec3'>;
  readonly roughness: F;
  readonly normal: Node<'vec3'>;
  readonly emissive: Node<'vec3'>;
  readonly metalness: F;
}

/** Rectángulo suave [a,b] en 1D. */
const band = (x: F, a: number | F, b: number | F): F => step(a, x).mul(step(x, b));

/**
 * Fachada procedural (MAT-1): textura PBR tintada por la apariencia del edificio
 * (color de vértice) + grilla de ventanas por piso calculada desde UV en metros.
 * `facade` = (largo de pared, altura de pared, 1 si es cara interior/gablete).
 */
export function facadeNodes(set: PbrSet, p: FacadeParams): FacadeNodes {
  const facade = attribute('facade', 'vec3');
  const wallLen = facade.x;
  const wallH = facade.y;
  // z: 0 ventanas pintadas (LOD lejano), 1 liso (hastial, retiro, parapeto), 2 muro cercano.
  const plain = step(0.5, facade.z);
  const streaksOn = float(1).sub(plain).add(step(1.5, facade.z));
  const u = uv().x;
  const v = uv().y;
  const tuv = vec2(u, v).div(p.tile);

  // Muro: textura tintada conservando su detalle de luminancia.
  const tex = texture(set.color, tuv).rgb;
  const tint = vertexColor().rgb.mul(luminance(tex).div(p.textureLuma));
  // keepTexture: cuánto del color propio de la textura (tono por ladrillo, mortero) se conserva,
  // llevado al brillo del color del edificio.
  let wall = mix(tint, tex.mul(luminance(vertexColor().rgb).div(p.textureLuma)), p.keepTexture);
  // Suciedad en la base y leve degradé de altura (lectura de escala, "grime").
  wall = wall.mul(mix(float(0.72), float(1), smoothstep(0.0, 0.9, v)));
  // Manchas de humedad/polución a gran escala (rompen la uniformidad del muro).
  const stain = mx_noise_float(positionWorld.mul(vec3(0.35, 0.9, 0.35))).mul(0.5).add(0.5);
  wall = wall.mul(mix(float(0.86), float(1.04), stain));
  // Losas entre pisos: banda levemente más oscura.
  const lv = fract(v.div(LEVEL)).mul(LEVEL);
  wall = wall.mul(mix(float(0.88), float(1), step(0.16, lv)));

  // Grilla de ventanas.
  const bays = floor(wallLen.div(BAY));
  const offset = wallLen.sub(bays.mul(BAY)).mul(0.5);
  const uu = u.sub(offset);
  const bu = fract(uu.div(BAY)).mul(BAY);
  const level = floor(v.div(LEVEL));
  const bayIdx = floor(uu.div(BAY));
  const grid = band(uu, 0, bays.mul(BAY)).mul(step(MIN_WALL, wallLen));
  const usable = grid.mul(step(v.add(TOP_MARGIN), wallH)).mul(float(1).sub(plain));
  const x0 = (BAY - WIN_W) / 2;
  const x1 = (BAY + WIN_W) / 2;
  const glass = band(bu, x0, x1).mul(band(lv, SILL, HEAD)).mul(usable);
  const frameRect = band(bu, x0 - FRAME, x1 + FRAME).mul(band(lv, SILL - FRAME, HEAD + FRAME)).mul(usable);
  const frame = frameRect.sub(glass).clamp(0, 1);
  const mullion = band(bu, BAY / 2 - 0.03, BAY / 2 + 0.03).mul(glass);
  const sill = band(bu, x0 - 0.12, x1 + 0.12).mul(band(lv, SILL - 0.12, SILL - FRAME)).mul(usable);

  // Chorreaduras bajo cada alféizar (posición conocida por la gramática) y suciedad hacia el suelo.
  const winExists = step(level.mul(LEVEL).add(HEAD), wallH.sub(TOP_MARGIN));
  const below = float(SILL).sub(lv);
  const under = band(bu, x0 - 0.05, x1 + 0.05).mul(step(0, below)).mul(grid).mul(winExists).mul(streaksOn);
  const drip = mx_noise_float(vec3(uu.mul(9), v.mul(0.5), wallLen)).mul(0.5).add(0.5);
  const streak = under.mul(float(1).sub(smoothstep(0, 1.7, below))).mul(smoothstep(0.35, 0.8, drip));
  wall = wall.mul(float(1).sub(streak.mul(0.32)));
  const splash = float(1).sub(smoothstep(0, 1.1, v)).mul(smoothstep(0.3, 0.7, mx_noise_float(vec3(u.mul(1.5), v.mul(3), 2.3)).mul(0.5).add(0.5)));
  wall = wall.mul(float(1).sub(splash.mul(0.25)));

  // Vidrio: oscuro y reflectivo; de noche algunas ventanas se encienden (hash por ventana).
  const seed = hash(level.mul(17.13).add(bayIdx.mul(3.71)).add(wallLen.mul(0.37)).add(wallH));
  const lit = step(0.52, seed).mul(sceneUniforms.night);
  const glassColor = mix(color('#1d2630'), color('#2c3a46'), seed);
  const frameColor = color('#d9d6cf');
  const glassOnly = glass.sub(mullion).clamp(0, 1);

  // Retiro de la ventana: sombra interior junto al marco (lectura de profundidad).
  const edge = min(min(bu.sub(x0), float(x1).sub(bu)), min(lv.sub(SILL), float(HEAD).sub(lv)));
  const reveal = mix(float(0.35), float(1), smoothstep(0.0, 0.16, edge));
  // Interiores: algunas ventanas con cortina/persiana (tono tela, a media altura).
  const curtain = step(0.62, hash(seed.mul(57.3))).mul(step(lv, mix(float(HEAD), float(SILL + 0.6), hash(seed.mul(13.1)))));
  const pane = mix(glassColor, color('#8a7f6e').mul(0.55), curtain.mul(0.8)).mul(reveal);
  let c = mix(wall, pane, glassOnly);
  c = mix(c, frameColor.mul(0.85), max(frame, mullion));
  c = mix(c, color('#bfbab0'), sill);

  const wallRough = texture(set.rough, tuv).g;
  const roughness = mix(wallRough, float(0.06), glassOnly);
  const metalness = mix(float(0), float(0.0), glassOnly);
  const nWall = normalMap(texture(set.normal, tuv));
  const warm = mix(vec3(1.0, 0.72, 0.42), vec3(0.85, 0.92, 1.0), hash(seed.mul(91.7)).mul(0.6));
  const emissive = warm.mul(glassOnly).mul(lit).mul(min(float(1), seed.sub(0.52).mul(6).add(0.4))).mul(2.2);
  return { color: c, roughness, normal: nWall, emissive, metalness };
}
