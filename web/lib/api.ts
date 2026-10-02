/**
 * Browser-side API client.
 *
 * Every call goes through here so the Render origin, timeouts, and the
 * "Failed to fetch" message are defined once. `NEXT_PUBLIC_*` is inlined at
 * **build** time — changing it on the dashboard without a rebuild does nothing.
 */

import { authHeaders, clearToken } from "./auth";

const RAW_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE ??
  "http://127.0.0.1:8000";

export const API_BASE = RAW_BASE.replace(/\/$/, "");

export const FETCH_TIMEOUT_MS = 60_000;

export const UNREACHABLE_MESSAGE =
  "Can't reach the server. It may be waking up, please retry in ~30s";

export function apiUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${suffix}`;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isUnreachable(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

function userAborted(signal: AbortSignal | null | undefined): boolean {
  return Boolean(signal?.aborted);
}

function isRetryableNetworkFailure(error: unknown, signal?: AbortSignal | null): boolean {
  if (userAborted(signal)) return false;
  if (error instanceof ApiError) return false;
  if (error instanceof DOMException && error.name === "AbortError") {
    // Timeout abort, not a user cancel.
    return !userAborted(signal);
  }
  if (error instanceof TypeError) return true;
  return error instanceof Error && /failed to fetch|networkerror|load failed/i.test(error.message);
}

export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onUserAbort = () => controller.abort();
  init.signal?.addEventListener("abort", onUserAbort);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", onUserAbort);
  }
}

/**
 * One automatic retry on a cold-start / network failure (Render free tier).
 * A user abort is never retried.
 */
export async function fetchWithRetry(input: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetchWithTimeout(input, init);
  } catch (error) {
    if (!isRetryableNetworkFailure(error, init.signal)) {
      if (userAborted(init.signal)) throw error;
      throw new ApiError(0, UNREACHABLE_MESSAGE);
    }
    try {
      return await fetchWithTimeout(input, init);
    } catch {
      if (userAborted(init.signal)) throw error;
      throw new ApiError(0, UNREACHABLE_MESSAGE);
    }
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetchWithRetry(apiUrl(path), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, UNREACHABLE_MESSAGE);
  }

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/")) {
      clearToken();
    }
    throw new ApiError(response.status, await readError(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** Multipart upload: the browser must set the boundary, so do not force JSON. */
export async function apiUpload<T>(path: string, body: FormData): Promise<T> {
  const response = await fetchWithRetry(apiUrl(path), {
    method: "POST",
    headers: { ...authHeaders() },
    body,
  });
  if (!response.ok) {
    if (response.status === 401) clearToken();
    throw new ApiError(response.status, await readError(response));
  }
  return (await response.json()) as T;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string };
    if (typeof body.detail === "string") return body.detail;
  } catch {
    // Fall through.
  }
  return response.status === 429
    ? "You're sending questions too quickly. Please wait a moment."
    : "Something went wrong. Please try again.";
}
