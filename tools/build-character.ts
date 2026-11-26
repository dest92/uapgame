/**
 * Prepara el personaje jugable (Hito 2):
 *  - public/models/character/student.glb   (malla + esqueleto, texturas KTX2, meshopt)
 *  - public/models/character/animations.glb (solo los clips usados, sin malla)
 * Fuente: Quaternius Universal Base Characters + Universal Animation Library (CC0).
 *   node tools/fetch-quaternius.mjs && npm run data:character
 */
import { NodeIO, type Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, quantize, resample, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { compressTexturesKtx2 } from './lib/assets/ktx2';

const UBC = '.cache/quaternius/ubc/Universal Base Characters[Standard]/Base Characters/Godot - UE/Superhero_Male_FullBody.gltf';
const UAL = '.cache/quaternius/ual/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb';
const OUT = 'public/models/character';
/** Clips que usa el juego (MOV-5) + interacción. */
export const CLIPS = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Jump_Start', 'Jump_Loop', 'Jump_Land', 'Interact'];

/** El pack referencia `X_png.png` en lugar de `X.png`: genera una copia con URIs válidas. */
function patchMissingUris(gltfPath: string): string {
  const json = JSON.parse(readFileSync(gltfPath, 'utf8')) as { images?: { uri?: string }[] };
  for (const img of json.images ?? []) {
    if (img.uri && !existsSync(join(dirname(gltfPath), img.uri))) img.uri = img.uri.replace('_png.png', '.png');
  }
  const out = gltfPath.replace(/\.gltf$/, '.patched.gltf');
  writeFileSync(out, JSON.stringify(json));
  return out;
}

async function finish(io: NodeIO, doc: Document, path: string): Promise<void> {
  await doc.transform(dedup(), prune(), weld(), quantize());
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  await io.write(path, doc);
  console.log(`✓ ${path} (${(statSync(path).size / 1024).toFixed(0)} KB)`);
}

async function main(): Promise<void> {
  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
  });
  mkdirSync(OUT, { recursive: true });

  const character = await io.read(patchMissingUris(UBC));
  for (const anim of character.getRoot().listAnimations()) anim.dispose();
  await compressTexturesKtx2(character, { color: 1024, normal: 512, data: 512 });
  await finish(io, character, `${OUT}/student.glb`);

  const anims = await io.read(UAL);
  const root = anims.getRoot();
  for (const a of root.listAnimations()) {
    if (CLIPS.includes(a.getName())) continue;
    // dispose() del clip no libera samplers/canales: hay que hacerlo explícito para que prune() borre sus accessors.
    a.listChannels().forEach((c) => c.dispose());
    a.listSamplers().forEach((sm) => sm.dispose());
    a.dispose();
  }
  for (const node of root.listNodes()) if (node.getMesh()) node.setMesh(null).setSkin(null);
  for (const m of root.listMeshes()) m.dispose();
  await anims.transform(resample({ tolerance: 1e-4 }));
  await finish(io, anims, `${OUT}/animations.glb`);
}

main().catch((e: unknown) => {
  console.error('✗', e instanceof Error ? e.stack : e);
  process.exit(1);
});
