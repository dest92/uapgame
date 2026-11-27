/**
 * Optimiza modelos CC0 de Poly Haven para tiempo real (2 LODs):
 * hojas raleadas por islas, ramas/tronco simplificados (meshoptimizer),
 * texturas KTX2 y geometría meshopt → public/models/vegetation/<id>_lod{0,1}.glb
 *   npm run assets:polyhaven && npm run data:vegetation
 */
import { NodeIO, type Document, type Primitive } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { dedup, prune, quantize, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import sharp from 'sharp';
import { compressTexturesKtx2 } from './lib/assets/ktx2';
import { thinFoliage } from './lib/assets/foliageDecimation';

interface Lod {
  readonly leafFraction: number;
  readonly leafGrow: number;
  readonly simplify: number;
  readonly texture: number;
}
interface ModelSpec {
  readonly id: string;
  readonly lods: readonly Lod[];
}

const MODELS: readonly ModelSpec[] = [
  { id: 'jacaranda_tree', lods: [
    { leafFraction: 0.014, leafGrow: 2.6, simplify: 0.015, texture: 1024 },
    { leafFraction: 0.003, leafGrow: 4.5, simplify: 0.002, texture: 512 },
  ] },
  { id: 'shrub_03', lods: [{ leafFraction: 1, leafGrow: 1, simplify: 1, texture: 512 }] },
  { id: 'shrub_04', lods: [{ leafFraction: 1, leafGrow: 1, simplify: 1, texture: 512 }] },
  { id: 'painted_wooden_bench', lods: [{ leafFraction: 1, leafGrow: 1, simplify: 1, texture: 512 }] },
];

const isFoliage = (p: Primitive): boolean => {
  const m = p.getMaterial();
  return !!m && (m.getAlphaMode() !== 'OPAQUE' || /leaf|leaves/i.test(m.getName()));
};

function reducePrimitive(doc: Document, p: Primitive, lod: Lod): void {
  const pos = p.getAttribute('POSITION');
  const idx = p.getIndices();
  if (!pos || !idx) return;
  const positions = new Float32Array(pos.getArray()!);
  const indices = new Uint32Array(idx.getArray()!);
  if (isFoliage(p)) {
    if (lod.leafFraction >= 1) return;
    const out = thinFoliage({ positions, indices }, lod.leafFraction, lod.leafGrow);
    pos.setArray(out.positions);
    p.setIndices(doc.createAccessor().setType('SCALAR').setArray(out.indices).setBuffer(idx.getBuffer()));
    p.getMaterial()!.setAlphaMode('MASK').setAlphaCutoff(0.5).setDoubleSided(true);
    return;
  }
  if (lod.simplify >= 1) return;
  // Ramitas: islas disjuntas como las hojas → se ralean (sin agrandar).
  if (/branch/i.test(p.getMaterial()?.getName() ?? '')) {
    const out = thinFoliage({ positions, indices }, Math.min(1, lod.leafFraction * 3), 1);
    p.setIndices(doc.createAccessor().setType('SCALAR').setArray(out.indices).setBuffer(idx.getBuffer()));
    return;
  }
  const target = Math.max(36, Math.floor((indices.length * lod.simplify) / 3) * 3);
  // Las costuras de UV parten la topología: el simplificador "sloppy" las ignora.
  const [simplified] = MeshoptSimplifier.simplifySloppy(indices, positions, 3, null, target, 1);
  p.setIndices(doc.createAccessor().setType('SCALAR').setArray(simplified).setBuffer(idx.getBuffer()));
}

/**
 * Los materiales con recorte (hojas) necesitan alfa: se combina el difuso RGB con el
 * mapa `<material>_alpha_*.jpg` en una imagen RGBA antes de codificar a KTX2.
 */
async function applyAlphaMaps(doc: Document, id: string, size: number): Promise<void> {
  const dir = `.cache/polyhaven/${id}/textures`;
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => /_alpha_/.test(f)) : [];
  for (const mat of doc.getRoot().listMaterials()) {
    if (mat.getAlphaMode() === 'OPAQUE') continue;
    const tex = mat.getBaseColorTexture();
    const file = files.find((f) => f.startsWith(`${mat.getName()}_alpha`)) ?? (files.length === 1 ? files[0] : undefined);
    if (!tex?.getImage() || !file) continue;
    const base = sharp(tex.getImage()!);
    const { width, height } = await base.metadata();
    const alpha = await sharp(readFileSync(`${dir}/${file}`)).resize(width, height).greyscale().raw().toBuffer();
    const rgba = await sharp(await base.removeAlpha().joinChannel(alpha, { raw: { width: width!, height: height!, channels: 1 } }).png().toBuffer())
      .resize(size, size, { fit: 'fill' }).webp({ quality: 82, alphaQuality: 90 }).toBuffer();
    // WebP conserva el alfa (el ETC1S de KTX2 lo descartaba); GLTFLoader lo soporta vía EXT_texture_webp.
    doc.createExtension(EXTTextureWebP).setRequired(true);
    tex.setImage(new Uint8Array(rgba)).setMimeType('image/webp').setURI(tex.getURI().replace(/\.[a-z]+$/i, '.webp'));
    mat.setAlphaMode('MASK').setAlphaCutoff(0.5).setDoubleSided(true);
    console.log(`    alfa: ${mat.getName()} ← ${file}`);
  }
}

async function main(): Promise<void> {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
  mkdirSync('public/models/vegetation', { recursive: true });
  const only = process.argv.slice(2);
  for (const spec of MODELS.filter((m) => !only.length || only.includes(m.id))) {
    for (const [i, lod] of spec.lods.entries()) {
      const doc = await io.read(`.cache/polyhaven/${spec.id}/${spec.id}.gltf`);
      for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) reducePrimitive(doc, p, lod);
      await applyAlphaMaps(doc, spec.id, lod.texture);
      await doc.transform(prune(), weld(), dedup());
      await compressTexturesKtx2(doc, { color: lod.texture, normal: lod.texture / 2, data: lod.texture / 4 });
      await doc.transform(prune(), quantize());
      doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
      const out = `public/models/vegetation/${spec.id}_lod${i}.glb`;
      await io.write(out, doc);
      const tris = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).reduce((a, p) => a + (p.getIndices()?.getCount() ?? 0) / 3, 0);
      for (const p of doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives())) {
        console.log(`    ${p.getMaterial()?.getName()}: ${((p.getIndices()?.getCount() ?? 0) / 3).toLocaleString()} tris`);
      }
      console.log(`✓ ${out} — ${Math.round(tris).toLocaleString()} tris, ${(statSync(out).size / 1024).toFixed(0)} KB`);
    }
  }
}

main().catch((e: unknown) => {
  console.error('✗', e instanceof Error ? e.stack : e);
  process.exit(1);
});
