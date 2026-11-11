import { CATEGORIES, type Category, type ChatMessage, type Item, type OutfitSuggestion } from '../types';
import { AIError, postJson } from './client';
import type { TextModel } from '../settings';

const API = 'https://generativelanguage.googleapis.com/v1beta/models';

export const TEXT_MODELS: TextModel[] = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

const IMAGE_MODELS = ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image'];

interface Part {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
}

interface Candidate {
  content?: { parts?: Part[] };
  finishReason?: string;
}

interface GeminiPayload {
  candidates?: Candidate[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

function textOf(payload: GeminiPayload): string {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function imagePartsOf(payload: GeminiPayload): string[] {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter(
      (part) =>
        typeof part.inlineData?.data === 'string' &&
        (part.inlineData.mimeType ?? '').startsWith('image/'),
    )
    .map((part) => part.inlineData!.data as string);
}

function parseJsonLoose(text: string): unknown | null {
  const cleaned = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function withModelFallback<T>(
  models: string[],
  fn: (model: string) => Promise<T>,
): Promise<T> {
  let lastError: unknown = null;
  for (const model of models) {
    try {
      return await fn(model);
    } catch (error) {
      lastError = error;
      if (error instanceof AIError && error.code === 'MODEL') continue;
      throw error;
    }
  }
  throw (
    lastError ??
    new AIError('MODEL', 'No Gemini model on this key could answer. Try another model in Settings.')
  );
}

async function callModel(
  model: string,
  key: string,
  body: Record<string, unknown>,
  timeoutMs = 120_000,
): Promise<GeminiPayload> {
  const json = await postJson(
    `${API}/${model}:generateContent?key=${encodeURIComponent(key.trim())}`,
    body,
    {},
    timeoutMs,
  );
  return json as GeminiPayload;
}

export interface GarmentInsight {
  name: string;
  category: Category;
  color?: string;
  brand?: string;
}

export async function analyzeGarment(
  key: string,
  preferredModel: TextModel,
  image: { data: string; mimeType: string },
): Promise<GarmentInsight> {
  const models = [preferredModel, ...TEXT_MODELS.filter((model) => model !== preferredModel)];
  return withModelFallback(models, async (model) => {
    const payload = await callModel(
      model,
      key,
      {
        systemInstruction: {
          parts: [
            {
              text: 'You catalogue fashion pieces for a private wardrobe. You are precise, never florid. Return only JSON matching the schema.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: image.mimeType, data: image.data } },
              {
                text: `Catalogue this garment.
name: a specific, human 2–4 word name in title case (e.g. "Washed leather bomber", "Pleated wool midi"). Never use the word "garment" or describe the photo.
category: one of ${CATEGORIES.map((c) => c.key).join(', ')}.
color: the dominant colour in one or two evocative words (e.g. "ecru", "oxblood", "washed black").
brand: only if a logo is clearly legible. Otherwise an empty string. Never guess.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              category: { type: 'STRING', enum: CATEGORIES.map((c) => c.key) },
              color: { type: 'STRING' },
              brand: { type: 'STRING' },
            },
            required: ['name', 'category'],
          },
        },
      },
      60_000,
    );

    const text = textOf(payload);
    const parsed = parseJsonLoose(text) as Partial<GarmentInsight> | null;
    if (!parsed || typeof parsed.name !== 'string') {
      throw new AIError('PARSE', 'The model could not read that piece. Try another photo.');
    }
    const category = CATEGORIES.some((c) => c.key === parsed.category)
      ? (parsed.category as Category)
      : 'top';
    return {
      name: parsed.name.trim().slice(0, 60) || 'New piece',
      category,
      color: typeof parsed.color === 'string' && parsed.color.trim() ? parsed.color.trim() : undefined,
      brand: typeof parsed.brand === 'string' && parsed.brand.trim() ? parsed.brand.trim() : undefined,
    };
  });
}

const STYLIST_SYSTEM = `You are Atelier, a fashion stylist with a precise, warm, editorial voice.
You can only style pieces the user already owns. Build looks exclusively from the wardrobe ids provided. Never invent an item or a variant (no "add a belt" unless that belt is in the wardrobe).
Keep the reply under 60 words. No markdown, no emojis, no lists — one or two sentences with a point of view.
When you propose a look, include exactly one outfit: a short evocative name, 2 to 5 itemIds that all exist in the wardrobe, and one sentence on why it works.
If the request is not about clothing, answer briefly and steer back to style.`;

interface StylistRaw {
  reply?: string;
  outfit?: { name?: string; itemIds?: string[]; reason?: string };
  tip?: string;
}

export interface StylistReply {
  reply: string;
  suggestion?: OutfitSuggestion;
  tip?: string;
}

export async function stylistAdvice(args: {
  key: string;
  model: TextModel;
  prompt: string;
  wardrobe: Item[];
  history: ChatMessage[];
}): Promise<StylistReply> {
  const { key, model, prompt, wardrobe, history } = args;
  const models = [model, ...TEXT_MODELS.filter((m) => m !== model)];

  const wardrobeText = wardrobe.length
    ? wardrobe
        .map(
          (item) =>
            `- ${item.id} | ${item.name} | ${item.category}${item.color ? ` | ${item.color}` : ''}${
              item.brand ? ` | ${item.brand}` : ''
            }`,
        )
        .join('\n')
    : '(the wardrobe is empty)';

  const historyText = history
    .slice(-8)
    .map((message) => `${message.role === 'user' ? 'User' : 'Atelier'}: ${message.text}`)
    .join('\n');

  return withModelFallback(models, async (activeModel) => {
    const payload = await callModel(activeModel, key, {
      systemInstruction: { parts: [{ text: STYLIST_SYSTEM }] },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `WARDROBE\n${wardrobeText}\n\nRECENT CONVERSATION\n${
                historyText || '(none)'
              }\n\nREQUEST\n${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            reply: { type: 'STRING' },
            outfit: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                itemIds: { type: 'ARRAY', items: { type: 'STRING' } },
                reason: { type: 'STRING' },
              },
              required: ['name', 'itemIds', 'reason'],
            },
            tip: { type: 'STRING' },
          },
          required: ['reply'],
        },
      },
    });

    const text = textOf(payload);
    if (!text) {
      const blocked = payload.promptFeedback?.blockReason;
      throw new AIError(
        'PARSE',
        blocked
          ? 'The stylist declined that request. Try rephrasing it.'
          : 'The stylist returned an empty answer. Try again.',
      );
    }

    const raw = parseJsonLoose(text) as StylistRaw | null;
    if (!raw) {
      return { reply: text.slice(0, 600) };
    }

    const validIds = new Set(wardrobe.map((item) => item.id));
    let suggestion: OutfitSuggestion | undefined;
    if (raw.outfit && Array.isArray(raw.outfit.itemIds)) {
      const ids = Array.from(
        new Set(raw.outfit.itemIds.filter((id) => typeof id === 'string' && validIds.has(id))),
      ).slice(0, 5);
      if (
        ids.length > 0 &&
        typeof raw.outfit.name === 'string' &&
        typeof raw.outfit.reason === 'string'
      ) {
        suggestion = {
          name: raw.outfit.name.trim().slice(0, 60) || 'A new look',
          itemIds: ids,
          reason: raw.outfit.reason.trim().slice(0, 280),
        };
      }
    }

    return {
      reply: typeof raw.reply === 'string' ? raw.reply.trim() : text.slice(0, 600),
      suggestion,
      tip: typeof raw.tip === 'string' && raw.tip.trim() ? raw.tip.trim() : undefined,
    };
  });
}

/**
 * Gemini image generation/editing. Used for try-on (it accepts real photos)
 * and as a fallback for casting when NVIDIA fails.
 */
export async function generateGeminiImage(args: {
  key: string;
  prompt: string;
  images?: { data: string; mimeType: string }[];
  timeoutMs?: number;
}): Promise<string> {
  const { key, prompt, images = [], timeoutMs = 180_000 } = args;

  return withModelFallback(IMAGE_MODELS, async (model) => {
    const payload = await callModel(
      model,
      key,
      {
        contents: [
          {
            role: 'user',
            parts: [
              ...images.map((image) => ({
                inlineData: { mimeType: image.mimeType, data: image.data },
              })),
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 1,
          responseModalities: ['TEXT', 'IMAGE'],
        },
      },
      timeoutMs,
    );

    const imagesOut = imagePartsOf(payload);
    if (imagesOut.length === 0) {
      const reason = textOf(payload) || payload.promptFeedback?.blockReason;
      throw new AIError(
        'PROVIDER',
        reason
          ? `The image model answered without an image. ${reason.slice(0, 150)}`
          : 'The image model answered without an image. Try again.',
      );
    }
    return imagesOut[0];
  });
}
