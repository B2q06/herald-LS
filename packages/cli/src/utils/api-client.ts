import { DEFAULT_PORT } from '@herald/shared';

/**
 * Simple fetch wrapper for Herald daemon API calls.
 */

export class DaemonUnreachableError extends Error {
  constructor(url: string, cause?: unknown) {
    super(`Herald daemon unreachable at ${url}. Is it running?`);
    this.name = 'DaemonUnreachableError';
    this.cause = cause;
  }
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly body: unknown;

  constructor(statusCode: number, body: unknown) {
    const msg = typeof body === 'object' && body !== null && 'error' in body
      ? (body as { error: string }).error
      : `API returned ${statusCode}`;
    super(msg);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

function getBaseUrl(): string {
  // 1. Check environment variable
  if (process.env.HERALD_URL) {
    return process.env.HERALD_URL.replace(/\/$/, '');
  }

  // 2. Default to localhost with configured port
  return `http://localhost:${DEFAULT_PORT}`;
}

export async function get<T = unknown>(path: string): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new DaemonUnreachableError(baseUrl, err);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body);
  }

  return response.json() as Promise<T>;
}

/** Safely encode a path segment (e.g. agent name) for use in URLs. */
export function agentPath(name: string): string {
  return encodeURIComponent(name);
}

export async function post<T = unknown>(path: string, body?: unknown): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    throw new DaemonUnreachableError(baseUrl, err);
  }

  if (!response.ok) {
    const respBody = await response.json().catch(() => null);
    throw new ApiError(response.status, respBody);
  }

  return response.json() as Promise<T>;
}
