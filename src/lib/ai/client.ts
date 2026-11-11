export type AIErrorCode =
  | 'NO_KEY'
  | 'AUTH'
  | 'RATE'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'PROVIDER'
  | 'MODEL'
  | 'PARSE'
  | 'NEED_GEMINI';

export class AIError extends Error {
  code: AIErrorCode;
  detail?: string;
  status?: number;

  constructor(code: AIErrorCode, message: string, detail?: string, status?: number) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

function codeForStatus(status: number): AIErrorCode {
  if (status === 401 || status === 403) return 'AUTH';
  if (status === 429 || status === 402) return 'RATE';
  if (status === 404) return 'MODEL';
  return 'PROVIDER';
}

function detailFrom(body: unknown, fallback: string): string {
  if (typeof body === 'string' && body.trim()) return body.trim().slice(0, 320);
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const candidate =
      record.detail ??
      (record.error as Record<string, unknown> | undefined)?.message ??
      record.message ??
      (typeof record.error === 'string' ? record.error : undefined);
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().slice(0, 320);
  }
  return fallback;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 60_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AIError(
        'TIMEOUT',
        'The provider took too long to answer. Try again in a moment.',
      );
    }
    throw new AIError(
      'NETWORK',
      'No connection to the AI provider. Check your network and try again.',
      error instanceof Error ? error.message : undefined,
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  timeoutMs = 180_000,
): Promise<unknown> {
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );

  const raw = await res.text();
  let parsed: unknown = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = { message: raw.slice(0, 300) };
  }

  if (!res.ok) {
    const message = detailFrom(parsed, `The provider returned ${res.status}.`);
    throw new AIError(
      codeForStatus(res.status),
      message,
      message,
      res.status,
    );
  }

  return parsed;
}

export function friendlyError(error: unknown): string {
  if (error instanceof AIError) {
    if (error.code === 'AUTH') {
      return 'That key was rejected. Check it in Settings — it may be expired or from the wrong project.';
    }
    if (error.code === 'RATE') {
      return 'The provider is rate-limiting this key. Wait a minute, then try again.';
    }
    if (error.code === 'MODEL') {
      return 'That model is not available on this key. Pick a different model in Settings.';
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Try again.';
}
