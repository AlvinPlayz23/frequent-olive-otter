import { AIError, postJson } from './client';

const FLUX_URL =
  'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux-3-image-klein';

const PERSONA_PROMPT = (descriptor: string) =>
  `Full-body editorial fashion portrait of ${descriptor}. Standing straight, arms relaxed at the sides, facing the camera, head and shoes fully visible, head-to-toe framing. Plain warm-grey seamless studio backdrop, soft diffused daylight from the left, shot on an 85mm lens, natural skin texture, subtle film grain, minimal unbranded neutral clothing, calm confident expression. No text, no logos, no graphics. Vertical 3:4 composition.`;

interface FluxResponse {
  artifacts?: { base64?: string; data?: string }[];
  image?: string;
  detail?: string;
}

function extractBase64(json: unknown): string {
  const data = json as FluxResponse;
  let value = data.artifacts?.[0]?.base64 ?? data.artifacts?.[0]?.data ?? data.image;
  if (!value) {
    throw new AIError(
      'PROVIDER',
      'FLUX returned no image. Try again, or switch try-on to Gemini in Settings.',
    );
  }
  value = value.replace(/^data:image\/[a-z+.-]+;base64,/i, '');
  return value;
}

async function callFlux(
  key: string,
  payload: Record<string, unknown>,
  timeoutMs = 180_000,
): Promise<string> {
  const json = await postJson(
    FLUX_URL,
    {
      steps: 16,
      seed: Math.floor(Math.random() * 1_000_000),
      ...payload,
    },
    {
      Authorization: `Bearer ${key.trim()}`,
      Accept: 'application/json',
    },
    timeoutMs,
  );
  return extractBase64(json);
}

/** Text-to-image on NVIDIA NIM — used for casting models. */
export async function nvidiaPortrait(key: string, descriptor: string): Promise<string> {
  return callFlux(key, {
    prompt: PERSONA_PROMPT(descriptor.trim() || 'a model'),
    mode: 'Image Generation',
    width: 832,
    height: 1216,
  });
}

/**
 * NVIDIA's hosted preview only accepts its own example images for edits,
 * so real-photo try-on will usually reject here — the caller falls back
 * to Gemini automatically. We still try, because if NVIDIA opens it up,
 * this path starts working with no code change.
 */
export async function nvidiaTryOn(
  key: string,
  prompt: string,
  photoBase64: string,
): Promise<string> {
  return callFlux(
    key,
    {
      prompt,
      mode: 'Image Editing',
      image: `data:image/jpeg;base64,${photoBase64}`,
      width: 832,
      height: 1216,
    },
    120_000,
  );
}
