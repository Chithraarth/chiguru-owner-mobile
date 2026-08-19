import NetInfo from "@react-native-community/netinfo";
import { getIdToken } from "../lib/firebase";
import { getActiveEstateId } from "../features/estate/store/estateStore";
import * as offlineQueue from "../lib/offlineQueue";
import { ApiError } from "./errors";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  // Fail loudly in dev rather than silently hitting a wrong/undefined host -
  // unlike the web apps, RN has no implicit same-origin API to fall back to.
  console.warn(
    "EXPO_PUBLIC_API_BASE_URL is not set - configure it in .env before making API calls."
  );
}

const TIMEOUT_JSON_MS = 20_000;
const TIMEOUT_MEDIA_MS = 60_000;

function apiUrl(path: string) {
  return `${API_BASE_URL ?? ""}/api${path}`;
}

export async function buildHeaders(extra?: HeadersInit): Promise<Headers> {
  const headers = new Headers(extra);
  headers.set("Content-Type", "application/json");
  // Tells the backend this is the Owner app — needed only for the rare
  // phone number that is both an Owner and, separately, an invited Manager
  // elsewhere; the backend uses it to pick the right farm instead of
  // guessing (see effectiveOwnerId in the backend's firebaseAuth.ts).
  headers.set("X-Actor-Role", "owner");
  const estateId = getActiveEstateId();
  if (estateId != null) headers.set("X-Estate-Id", String(estateId));
  const token = await getIdToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

function looksLikeOurApi(res: Response) {
  if (res.status === 204) return true;
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("application/json");
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON error body, ignore
  }
  const message = body?.message ?? body?.error ?? `Request failed with status ${res.status}`;
  const code = body?.code ?? (res.status === 401 ? "AUTH_REQUIRED" : undefined);
  return new ApiError(res.status, message, code, body);
}

export interface ApiFetchOptions extends RequestInit {
  mediaTimeout?: boolean;
}

/** Read-only requests. Never queues - throws ApiError on any failure. */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = await buildHeaders(options.headers);
  const timeoutMs = options.mediaTimeout ? TIMEOUT_MEDIA_MS : TIMEOUT_JSON_MS;

  const res = await withTimeout(
    (signal) => fetch(apiUrl(path), { ...options, headers, signal }),
    timeoutMs
  );

  if (!res.ok) throw await toApiError(res);
  if (!looksLikeOurApi(res)) {
    throw new ApiError(0, "Unexpected response (captive portal or offline gateway)");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface MutateOptions {
  /** Which offline queue to fall back to if the write can't complete now. */
  queueTable?: offlineQueue.QueueTable;
  /** Idempotency key resent unchanged on retry (estate-updates, worker-payments). */
  clientId?: string;
  mediaTimeout?: boolean;
  /** e.g. X-Owner-Key for the open classified boards (hire/equipment/produce/nursery). */
  extraHeaders?: HeadersInit;
}

/**
 * Writes (POST/PATCH/DELETE). Mirrors the web app's apiMutate: offline or a
 * network/timeout/5xx failure enqueues for later replay instead of throwing;
 * 4xx (validation) throws immediately and is never queued, except a 404 on
 * PATCH/DELETE which is treated as "already done".
 */
export async function apiMutate<T>(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  opts: MutateOptions = {}
): Promise<T | null> {
  const netState = await NetInfo.fetch();
  const queueTable = opts.queueTable ?? "sync_queue";

  if (netState.isConnected === false) {
    await offlineQueue.enqueue(queueTable, {
      path,
      method,
      body: JSON.stringify(body ?? {}),
      estateId: getActiveEstateId(),
      clientId: opts.clientId ?? null,
    });
    return null;
  }

  try {
    const headers = await buildHeaders(opts.extraHeaders);
    const timeoutMs = opts.mediaTimeout ? TIMEOUT_MEDIA_MS : TIMEOUT_JSON_MS;
    const res = await withTimeout(
      (signal) =>
        fetch(apiUrl(path), {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal,
        }),
      timeoutMs
    );

    if (!res.ok) {
      if (res.status >= 500) {
        await offlineQueue.enqueue(queueTable, {
          path,
          method,
          body: JSON.stringify(body ?? {}),
          estateId: getActiveEstateId(),
          clientId: opts.clientId ?? null,
        });
        return null;
      }
      if (res.status === 404 && (method === "DELETE" || method === "PATCH")) {
        return null; // already-done, safe no-op (matches web app behavior)
      }
      throw await toApiError(res);
    }

    if (!looksLikeOurApi(res)) {
      // Captive portal returning a 200 HTML page - treat as failure, queue.
      await offlineQueue.enqueue(queueTable, {
        path,
        method,
        body: JSON.stringify(body ?? {}),
        estateId: getActiveEstateId(),
        clientId: opts.clientId ?? null,
      });
      return null;
    }

    if (res.status === 204) return null;
    return res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Network error / timeout / abort -> queue for later retry.
    await offlineQueue.enqueue(queueTable, {
      path,
      method,
      body: JSON.stringify(body ?? {}),
      estateId: getActiveEstateId(),
      clientId: opts.clientId ?? null,
    });
    return null;
  }
}

export { apiUrl };
