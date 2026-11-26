/**
 * Copia los decodificadores Draco/Basis (KTX2) de three a public/libs para que
 * el loader los sirva localmente (sin CDNs externos).
 */
import { cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const src = join(root, 'node_modules/three/examples/jsm/libs');
const dst = join(root, 'public/libs');
mkdirSync(dst, { recursive: true });
cpSync(join(src, 'basis'), join(dst, 'basis'), { recursive: true });
cpSync(join(src, 'draco/gltf'), join(dst, 'draco'), { recursive: true });
console.log('Decoders copiados a public/libs');
