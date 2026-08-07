import NetInfo from "@react-native-community/netinfo";
import { getIdToken } from "./firebase";
import * as offlineQueue from "./offlineQueue";
import { useSyncStore } from "../store/syncStore";
import type { QueueItem, QueueTable } from "./offlineQueue";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

let flushing = false;

function apiUrl(path: string) {
  return `${API_BASE_URL ?? ""}/api${path}`;
}

function looksLikeOurApi(res: Response) {
  if (res.status === 204) return true;
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("application/json");
}

/**
 * Replays one queue table in order. Mirrors the web app's flushSyncQueue /
 * flushEstateUpdates: network/timeout error -> stop (retry the whole queue
 * later, preserve order); captive-portal 200 -> stop; 5xx -> stop; 4xx ->
 * bump attempts and continue to the next item (don't head-of-line block);
 * success -> delete and continue.
 */
async function flushTable(table: QueueTable): Promise<number> {
  const items: QueueItem[] = await offlineQueue.getAll(table);
  let flushed = 0;

  for (const item of items) {
    const token = await getIdToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (item.estateId != null) headers["X-Estate-Id"] = String(item.estateId);
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timeoutMs = table === "estate_updates_queue" ? 60_000 : 20_000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(apiUrl(item.path), {
        method: item.method,
        headers,
        body: item.body,
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timer);
      break; // network/timeout - stop, retry whole queue later
    }
    clearTimeout(timer);

    if (res.ok && looksLikeOurApi(res)) {
      await offlineQueue.remove(table, item.id);
      flushed += 1;
      continue;
    }
    if (res.status >= 500) break; // server down, retry later
    if (!res.ok) {
      // 4xx: bump attempts, drop after MAX_ATTEMPTS, keep going
      await offlineQueue.bumpAttempts(table, item.id, item.attempts + 1);
      continue;
    }
    break; // non-JSON 200 (captive portal)
  }

  return flushed;
}

export async function flushAll(): Promise<number | null> {
  if (flushing) return null; // single-flight guard
  flushing = true;
  try {
    const a = await flushTable("estate_updates_queue");
    const b = await flushTable("sync_queue");
    return a + b;
  } finally {
    flushing = false;
  }
}

export async function runSync(opts: { manual?: boolean } = {}) {
  const { setSyncing, setPendingCount, setLastSyncTime, setOnline } = useSyncStore.getState();
  const net = await NetInfo.fetch();
  const online = net.isConnected !== false;
  setOnline(online);

  if (!online && !opts.manual) {
    setPendingCount(await offlineQueue.getPendingCount());
    return;
  }

  setSyncing(true);
  try {
    const flushed = await flushAll();
    setPendingCount(await offlineQueue.getPendingCount());
    if (flushed !== null) setLastSyncTime(Date.now());
  } finally {
    setSyncing(false);
  }
}
