// Stable per-write client id, resent unchanged on every retry so the backend's
// clientId-based onConflictDoNothing dedupe (estate_updates, worker_payments)
// treats a replay as already-committed instead of creating a duplicate.
export function newClientId(): string {
  return `cm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
