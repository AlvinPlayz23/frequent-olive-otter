import { AIError, fetchWithTimeout } from './client';
import type { ImageResult } from '../types';

const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function secureUrl(value?: string | null): string | null {
  if (!value) return null;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('http://')) return `https://${value.slice(7)}`;
  if (value.startsWith('https://')) return value;
  return null;
}

function hostOf(value?: string | null): string {
  if (!value) return 'the web';
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return 'the web';
  }
}

interface GoogleItem {
  title?: string;
  link?: string;
  mime?: string;
  image?: {
    contextLink?: string;
    thumbnailLink?: string;
  };
}

interface GoogleResponse {
  items?: GoogleItem[];
  error?: { message?: string };
}

async function googleSearch(query: string, key: string, cx: string): Promise<ImageResult[]> {
  const params = new URLSearchParams({
    key: key.trim(),
    cx: cx.trim(),
    q: query,
    searchType: 'image',
    num: '10',
    safe: 'active',
  });

  const res = await fetchWithTimeout(
    `https://www.googleapis.com/customsearch/v1?${params.toString()}`,
    { headers: { Accept: 'application/json' } },
    25_000,
  );
  const raw = await res.text();
  let json: GoogleResponse = {};
  try {
    json = raw ? (JSON.parse(raw) as GoogleResponse) : {};
  } catch {
    json = {};
  }
  if (!res.ok) {
    const detail = json.error?.message ?? `Google returned ${res.status}.`;
    throw new AIError(
      res.status === 400 || res.status === 403 ? 'AUTH' : 'PROVIDER',
      res.status === 403
        ? 'Google rejected the Search key or engine id. Check both in Settings.'
        : detail,
    );
  }

  const results: ImageResult[] = [];
  for (const [index, item] of (json.items ?? []).entries()) {
    const image = secureUrl(item.link);
    const thumbnail = secureUrl(item.image?.thumbnailLink) ?? image;
    if (!image || !thumbnail) continue;
    if (item.mime && !item.mime.startsWith('image/')) continue;
    results.push({
      id: `g-${index}-${item.link?.slice(-28) ?? index}`,
      image,
      thumbnail,
      title: (item.title ?? 'Untitled image').trim(),
      source: hostOf(item.image?.contextLink ?? image),
      link: item.image?.contextLink,
    });
  }
  return results;
}

interface DuckResult {
  image?: string;
  thumbnail?: string;
  title?: string;
  url?: string;
}

async function duckSearch(query: string): Promise<ImageResult[]> {
  let vqd: string | null = null;
  try {
    const htmlRes = await fetchWithTimeout(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      {
        headers: {
          'User-Agent': DESKTOP_UA,
          Accept: 'text/html,application/xhtml+xml',
        },
      },
      20_000,
    );
    const html = await htmlRes.text();
    vqd =
      html.match(/vqd=["']([^"']+)["']/)?.[1] ??
      html.match(/vqd=([\w-]+)/)?.[1] ??
      null;
  } catch {
    vqd = null;
  }

  if (!vqd) {
    throw new AIError(
      'PROVIDER',
      'The free web search is busy right now. Add a Google Search key in Settings for reliable results.',
    );
  }

  const params = new URLSearchParams({
    l: 'us-en',
    o: 'json',
    q: query,
    vqd,
    f: ',,,',
    p: '1',
  });

  const res = await fetchWithTimeout(
    `https://duckduckgo.com/i.js?${params.toString()}`,
    {
      headers: {
        'User-Agent': DESKTOP_UA,
        Accept: 'application/json, text/javascript, */*; q=0.01',
        Referer: 'https://duckduckgo.com/',
        'X-Requested-With': 'XMLHttpRequest',
      },
    },
    25_000,
  );

  if (!res.ok) {
    throw new AIError(
      'PROVIDER',
      'The free web search is rate-limited. Add a Google Search key in Settings for reliable results.',
    );
  }

  const raw = await res.text();
  let json: { results?: DuckResult[] } = {};
  try {
    json = raw ? (JSON.parse(raw) as { results?: DuckResult[] }) : {};
  } catch {
    throw new AIError(
      'PROVIDER',
      'The free web search returned an unexpected page. Try again, or add a Google key.',
    );
  }

  const seen = new Set<string>();
  const results: ImageResult[] = [];
  for (const [index, item] of (json.results ?? []).entries()) {
    const image = secureUrl(item.image);
    const thumbnail = secureUrl(item.thumbnail) ?? image;
    if (!image || !thumbnail || seen.has(image)) continue;
    seen.add(image);
    results.push({
      id: `d-${index}-${image.slice(-28)}`,
      image,
      thumbnail,
      title: (item.title ?? 'Untitled image').trim(),
      source: hostOf(item.url ?? image),
      link: item.url,
    });
    if (results.length >= 24) break;
  }
  return results;
}

export async function searchImages(args: {
  query: string;
  cseKey: string;
  cseCx: string;
}): Promise<ImageResult[]> {
  const { query, cseKey, cseCx } = args;
  if (!query.trim()) return [];

  if (cseKey.trim() && cseCx.trim()) {
    try {
      const results = await googleSearch(query, cseKey, cseCx);
      if (results.length > 0) return results;
    } catch (error) {
      try {
        const results = await duckSearch(query);
        if (results.length > 0) return results;
      } catch {
        // Prefer the actionable Google error over the keyless one.
      }
      throw error;
    }
  }

  return duckSearch(query);
}
