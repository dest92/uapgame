import type { Document, Texture } from '@gltf-transform/core';
import { KHRTextureBasisu } from '@gltf-transform/extensions';
import { encodeToKTX2 } from 'ktx2-encoder';
import sharp from 'sharp';

export type TextureRole = 'color' | 'normal' | 'data';

const decoder = async (buffer: Uint8Array): Promise<{ data: Uint8Array; width: number; height: number }> => {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
};

/** Redimensiona (potencia de 2) y codifica a KTX2/Basis según el rol de la textura. */
export async function encodeKtx2(image: Uint8Array, role: TextureRole, maxSize: number): Promise<Uint8Array> {
  const meta = await sharp(image).metadata();
  const size = Math.min(maxSize, 2 ** Math.floor(Math.log2(Math.max(meta.width ?? 1, meta.height ?? 1))));
  const resized = new Uint8Array(await sharp(image).resize(size, size, { fit: 'fill' }).png().toBuffer());
  return encodeToKTX2(resized, {
    // ETC1S en todo: UASTC duplica el peso y el presupuesto total es < 15 MB.
    isUASTC: false,
    qualityLevel: role === 'color' ? 192 : 160,
    compressionLevel: 2,
    needSupercompression: true,
    isNormalMap: role === 'normal',
    isSetKTX2SRGBTransferFunc: role === 'color',
    isPerceptual: role === 'color',
    generateMipmap: true,
    imageDecoder: decoder,
  });
}

function roleOf(doc: Document, tex: Texture): TextureRole {
  for (const mat of doc.getRoot().listMaterials()) {
    if (mat.getNormalTexture() === tex) return 'normal';
    if (mat.getBaseColorTexture() === tex || mat.getEmissiveTexture() === tex) return 'color';
  }
  return 'data';
}

/** Convierte todas las texturas del documento a KTX2 (KHR_texture_basisu). */
export async function compressTexturesKtx2(doc: Document, maxSize: Partial<Record<TextureRole, number>>): Promise<void> {
  doc.createExtension(KHRTextureBasisu).setRequired(true);
  for (const tex of doc.getRoot().listTextures()) {
    const img = tex.getImage();
    // Las texturas con alfa ya convertidas a WebP se dejan: el encoder ETC1S descarta el alfa.
    if (!img || tex.getMimeType() === 'image/webp') continue;
    const role = roleOf(doc, tex);
    tex.setImage(await encodeKtx2(img, role, maxSize[role] ?? 1024));
    tex.setMimeType('image/ktx2');
    tex.setURI(tex.getURI().replace(/\.[a-z0-9]+$/i, '.ktx2'));
  }
}
