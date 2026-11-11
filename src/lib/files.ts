import { Image as RNImage } from 'react-native';
import * as FS from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { StoredImage } from './types';
import { newId } from './id';

const BASE = `${FS.documentDirectory ?? FS.cacheDirectory ?? ''}atelier/`;
const IMAGES = `${BASE}images/`;
const THUMBS = `${BASE}thumbs/`;
const TMP = `${BASE}tmp/`;

let ensured: Promise<void> | null = null;

export function ensureDirectories(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await FS.makeDirectoryAsync(IMAGES, { intermediates: true });
      await FS.makeDirectoryAsync(THUMBS, { intermediates: true });
      await FS.makeDirectoryAsync(TMP, { intermediates: true });
    })().catch((error) => {
      ensured = null;
      throw error;
    });
  }
  return ensured;
}

function sizeOf(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => reject(new Error('That image could not be read.')),
    );
  });
}

async function deleteQuietly(uri: string | null | undefined) {
  if (!uri || !uri.startsWith(BASE)) return;
  try {
    await FS.deleteAsync(uri, { idempotent: true });
  } catch {
    // A missing cache file is not an error worth surfacing.
  }
}

/**
 * Normalizes any local or remote image into our own document storage:
 * a full-size JPEG (max 1500px wide) and a small thumbnail.
 */
export async function ingestImage(
  sourceUri: string,
  prefix = 'piece',
  maxWidth = 1500,
): Promise<StoredImage> {
  await ensureDirectories();

  let working = sourceUri;
  let downloaded: string | null = null;

  if (/^https?:\/\//i.test(sourceUri)) {
    const cleaned = sourceUri.split('?')[0];
    const extMatch = cleaned.match(/\.(png|jpe?g|webp|heic|heif)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const target = `${TMP}${newId('download')}.${ext}`;
    try {
      const res = await FS.downloadAsync(sourceUri, target);
      if (res.status < 200 || res.status >= 300) {
        throw new Error('The image link could not be downloaded.');
      }
      downloaded = res.uri;
      working = res.uri;
    } catch (error) {
      await deleteQuietly(target);
      throw error instanceof Error ? error : new Error('The image link could not be downloaded.');
    }
  } else if (sourceUri.startsWith('data:')) {
    const match = sourceUri.match(/^data:image\/[\w+.-]+;base64,(.+)$/);
    if (!match) throw new Error('That image data could not be read.');
    const target = `${TMP}${newId('data')}.jpg`;
    await FS.writeAsStringAsync(target, match[1], { encoding: FS.EncodingType.Base64 });
    downloaded = target;
    working = target;
  }

  try {
    const size = await sizeOf(working);
    const actions =
      size.width > maxWidth ? [{ resize: { width: maxWidth } }] : [];

    const full = await manipulateAsync(working, actions, {
      compress: 0.86,
      format: SaveFormat.JPEG,
    });

    const thumb = await manipulateAsync(
      full.uri,
      [{ resize: { width: Math.min(520, full.width) } }],
      { compress: 0.74, format: SaveFormat.JPEG },
    );

    const imageUri = `${IMAGES}${newId(prefix)}.jpg`;
    const thumbUri = `${THUMBS}${newId(prefix)}.jpg`;
    await FS.copyAsync({ from: full.uri, to: imageUri });
    await FS.copyAsync({ from: thumb.uri, to: thumbUri });

    return { uri: imageUri, thumbUri, width: full.width, height: full.height };
  } finally {
    await deleteQuietly(downloaded);
  }
}

export async function ingestBase64(
  base64: string,
  prefix = 'image',
  maxWidth = 1500,
): Promise<StoredImage> {
  await ensureDirectories();
  const tmp = `${TMP}${newId('b64')}.jpg`;
  await FS.writeAsStringAsync(tmp, base64, { encoding: FS.EncodingType.Base64 });
  try {
    return await ingestImage(tmp, prefix, maxWidth);
  } finally {
    await deleteQuietly(tmp);
  }
}

/**
 * A compact JPEG for sending to a vision model — never the original photo.
 */
export async function readForAI(
  uri: string,
  maxWidth = 1024,
): Promise<{ data: string; mimeType: string }> {
  const size = await sizeOf(uri).catch(() => null);
  const actions =
    size && size.width > maxWidth ? [{ resize: { width: maxWidth } }] : [];
  const resized = await manipulateAsync(uri, actions, {
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  const data = await FS.readAsStringAsync(resized.uri, {
    encoding: FS.EncodingType.Base64,
  });
  return { data, mimeType: 'image/jpeg' };
}

export async function deleteImageFiles(image: {
  uri?: string | null;
  thumbUri?: string | null;
}) {
  await Promise.all([deleteQuietly(image.uri), deleteQuietly(image.thumbUri)]);
}

export function localImageExists(uri: string): Promise<boolean> {
  return FS.getInfoAsync(uri).then((info) => info.exists);
}
