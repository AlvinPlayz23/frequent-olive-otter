import { generateGeminiImage } from './ai/gemini';
import { AIError } from './ai/client';
import { nvidiaPortrait, nvidiaTryOn } from './ai/nvidia';
import { ingestBase64, readForAI } from './files';
import type { Item, Persona, StoredImage } from './types';
import type { Settings } from './settings';

const PERSONA_PROMPT = (descriptor: string) =>
  `Full-body editorial fashion portrait of ${descriptor}. Standing straight, arms relaxed at the sides, facing the camera, head and shoes fully visible, head-to-toe framing. Plain warm-grey seamless studio backdrop, soft diffused daylight from the left, 85mm lens, natural skin texture, subtle film grain, minimal unbranded neutral clothing, calm confident expression. No text, no logos, no graphics. Vertical 3:4 composition.`;

export interface GeneratedPortrait {
  image: StoredImage;
  engine: string;
}

export async function castPersona(
  settings: Settings,
  descriptor: string,
): Promise<GeneratedPortrait> {
  const subject = descriptor.trim() || 'a model';
  let nvidiaFailure: unknown = null;

  if (settings.nvidiaKey.trim() && settings.imageEngine === 'auto') {
    try {
      const base64 = await nvidiaPortrait(settings.nvidiaKey, subject);
      const image = await ingestBase64(base64, 'persona', 1400);
      return { image, engine: 'NVIDIA FLUX' };
    } catch (error) {
      nvidiaFailure = error;
    }
  }

  if (settings.geminiKey.trim()) {
    const base64 = await generateGeminiImage({
      key: settings.geminiKey,
      prompt: `${PERSONA_PROMPT(subject)} No text, no watermark.`,
    });
    const image = await ingestBase64(base64, 'persona', 1400);
    return { image, engine: 'Gemini' };
  }

  if (nvidiaFailure instanceof AIError) throw nvidiaFailure;
  throw new AIError(
    'NO_KEY',
    'Add an NVIDIA or Gemini key in Settings to cast a model.',
  );
}

export interface TryOnResult {
  image: StoredImage;
  engine: string;
}

export async function tryOnLook(args: {
  settings: Settings;
  persona: Persona;
  outfitName: string;
  items: Item[];
}): Promise<TryOnResult> {
  const { settings, persona, outfitName, items } = args;
  if (items.length === 0) {
    throw new AIError('PROVIDER', 'Add at least one piece to this look before trying it on.');
  }

  const garmentLine = items
    .map(
      (item, index) =>
        `${index + 1}. ${item.name} (${item.category}${item.color ? `, ${item.color}` : ''}${
          item.brand ? `, ${item.brand}` : ''
        })`,
    )
    .join('\n');

  const prompt = `Use the FIRST image as the person. Preserve their face, hair, skin tone, body proportions, pose and the background exactly — do not change their identity or the setting.

Replace only their outfit with these pieces, shown in the remaining reference images:
${garmentLine}

Keep each garment's colour, fabric, print and silhouette faithful to its reference. Layer them the way the pieces would actually be worn. Fit them naturally to the body with realistic folds, shadows and contact points. Keep accessories visible and placed correctly.

Photorealistic editorial fashion photograph of the full look "${outfitName}", full body head to toe, flattering natural light, sharp focus, subtle film grain. No text, no logos, no collage, no extra people. Vertical 3:4 framing.`;

  let nvidiaFailure: unknown = null;

  // Auto tries NVIDIA first because the user's free credits live there.
  if (settings.imageEngine === 'auto' && settings.nvidiaKey.trim()) {
    try {
      const photo = await readForAI(persona.imageUri, 1024);
      const base64 = await nvidiaTryOn(settings.nvidiaKey, prompt, photo.data);
      const image = await ingestBase64(base64, 'look', 1500);
      return { image, engine: 'NVIDIA FLUX' };
    } catch (error) {
      nvidiaFailure = error;
    }
  }

  if (settings.geminiKey.trim()) {
    const personaPhoto = await readForAI(persona.imageUri, 1024);
    const garments = await Promise.all(
      items.slice(0, 4).map((item) => readForAI(item.imageUri, 900)),
    );
    const base64 = await generateGeminiImage({
      key: settings.geminiKey,
      prompt,
      images: [personaPhoto, ...garments],
      timeoutMs: 180_000,
    });
    const image = await ingestBase64(base64, 'look', 1500);
    return { image, engine: 'Gemini' };
  }

  if (nvidiaFailure instanceof AIError) {
    throw new AIError(
      'NEED_GEMINI',
      'NVIDIA’s hosted preview cannot dress a real photo yet. Add a free Gemini key to finish this try-on.',
      nvidiaFailure.message,
    );
  }

  throw new AIError(
    'NO_KEY',
    'Add an NVIDIA or Gemini key in Settings to render a try-on.',
  );
}
