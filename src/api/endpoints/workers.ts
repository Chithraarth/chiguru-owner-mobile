import { apiMutate } from "../client";
import { newClientId } from "../../lib/idempotency";
import type { Worker } from "../../types/api";

// Quick-add a worker by name only (used by the inline worker-name-input on
// the Loans tab when the typed name doesn't match anyone in the list yet).
// clientId lets a retried request (offline queue, or a dropped response on a
// flaky connection) return the already-created worker instead of a
// duplicate - matches the same pattern as worker-payments/estate-updates.
export function createWorker(name: string) {
  return apiMutate<Worker>("POST", "/workers", { name, isActive: true, clientId: newClientId() });
}

// Soft-deletes the worker (recoverable from BinScreen). Matches web's
// apiMutate("DELETE", `/workers/${workerId}`).
export function deleteWorker(id: number) {
  return apiMutate<null>("DELETE", `/workers/${id}`);
}
