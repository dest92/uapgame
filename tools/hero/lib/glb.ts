/**
 * Escribe un hero asset: geometría fusionada por material → glTF binario con materiales PBR,
 * texturas de detalle KTX2 (Basis ETC1S) y geometría cuantizada + meshopt (spec 011, HERO-4).
 */
import { Document, NodeIO, type Texture } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRTextureBasisu } from '@gltf-transform/extensions';
import { prune, quantize, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import type { BufferGeometry } from 'three';
import { downloadAmbientCg } from '../../lib/assets/ambientcg';
import { encodeKtx2 } from '../../lib/assets/ktx2';
import { PROC_TEXTURES, normalFromHeight } from './proctex';
import { DETAIL_MEAN, HERO_TEXTURES, type HeroTexture, type HeroTextureSpec, type MaterialSpec, baseFactorFor, hexToLinear } from './materials';

/** Textura de color normalizada: media por canal = DETAIL_MEAN y contraste ajustado. */
async function detailTexture(name: HeroTexture): Promise<{ color: Uint8Array; normal?: Uint8Array }> {
  const spec: HeroTextureSpec = HERO_TEXTURES[name];
  let source: Buffer;
  let normalPng: Buffer | undefined;
  if (spec.proc) {
    // Textura procedural por texel (albedo + normal desde la altura).
    const t = PROC_TEXTURES[spec.proc](spec.size);
    const raw = { raw: { width: t.size, height: t.size, channels: 3 as const } };
    source = await sharp(Buffer.from(t.albedo), raw).png().toBuffer();
    normalPng = spec.normal ? await sharp(Buffer.from(normalFromHeight(t, spec.proc === 'plaster' ? 1.5 : 5)), raw).png().toBuffer() : undefined;
  } else {
    const dir = await downloadAmbientCg(spec.asset);
    const files = readdirSync(dir);
    const colorFile = files.find((f) => /_Color\.jpg$/.test(f));
    if (!colorFile) throw new Error(`${spec.asset}: sin mapa de color`);
    source = readFileSync(join(dir, colorFile));
    const normalFile = files.find((f) => /_NormalGL\.jpg$/.test(f));
    normalPng = spec.normal && normalFile ? readFileSync(join(dir, normalFile)) : undefined;
  }
  let img = sharp(source).resize(spec.size, spec.size).removeAlpha();
  if (spec.grey) img = img.greyscale();
  const stats = await img.clone().stats();
  const a = stats.channels.slice(0, 3).map(() => spec.contrast);
  const b = stats.channels.slice(0, 3).map((c) => DETAIL_MEAN - spec.contrast * c.mean);
  const png = await img.toColourspace('srgb').linear(spec.grey ? a[0]! : a, spec.grey ? b[0]! : b).png().toBuffer();
  const color = await encodeKtx2(new Uint8Array(png), 'color', spec.size);
  const normal = normalPng ? await encodeKtx2(new Uint8Array(normalPng), 'normal', spec.size / 2) : undefined;
  return { color, normal };
}

export interface HeroWriteResult {
  readonly bytes: number;
  readonly triangles: number;
}

export async function writeHeroGlb<M extends string>(
  out: string,
  name: string,
  geometries: ReadonlyMap<M, BufferGeometry>,
  materials: Readonly<Record<M, MaterialSpec>>,
): Promise<HeroWriteResult> {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
  const doc = new Document();
  doc.createExtension(KHRTextureBasisu).setRequired(true);
  const buffer = doc.createBuffer();
  const scene = doc.createScene(name);
  const root = doc.createNode(name);
  scene.addChild(root);
  const textures = new Map<HeroTexture, { color: Texture; normal?: Texture }>();
  const texFor = async (t: HeroTexture): Promise<{ color: Texture; normal?: Texture }> => {
    const hit = textures.get(t);
    if (hit) return hit;
    const data = await detailTexture(t);
    const entry = {
      color: doc.createTexture(`${t}_color`).setImage(data.color).setMimeType('image/ktx2'),
      normal: data.normal ? doc.createTexture(`${t}_normal`).setImage(data.normal).setMimeType('image/ktx2') : undefined,
    };
    textures.set(t, entry);
    return entry;
  };
  let triangles = 0;
  for (const [key, geo] of geometries) {
    const spec = materials[key];
    const mat = doc.createMaterial(key)
      .setBaseColorFactor(baseFactorFor(spec.color, !!spec.texture))
      .setRoughnessFactor(spec.roughness)
      .setMetallicFactor(spec.metalness ?? 0)
      .setDoubleSided(spec.doubleSided ?? false);
    if (spec.texture) {
      const t = await texFor(spec.texture);
      mat.setBaseColorTexture(t.color);
      if (t.normal) mat.setNormalTexture(t.normal);
    }
    if (spec.emissive) {
      const [r, g, b] = hexToLinear(spec.emissive);
      mat.setEmissiveFactor([r, g, b]);
    }
    const prim = doc.createPrimitive().setMaterial(mat);
    for (const [attr, gl] of [['position', 'POSITION'], ['normal', 'NORMAL'], ['uv', 'TEXCOORD_0'], ['color', 'COLOR_0']] as const) {
      const a = geo.getAttribute(attr);
      if (!a) continue;
      prim.setAttribute(gl, doc.createAccessor(`${key}_${gl}`).setType(a.itemSize === 3 ? 'VEC3' : 'VEC2').setArray(new Float32Array(a.array)).setBuffer(buffer));
    }
    triangles += geo.getAttribute('position').count / 3;
    const mesh = doc.createMesh(key).addPrimitive(prim);
    root.addChild(doc.createNode(key).setMesh(mesh));
  }
  await doc.transform(weld(), prune(), quantize({ quantizePosition: 16 }));
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
  await io.write(out, doc);
  return { bytes: statSync(out).size, triangles: Math.round(triangles) };
}
