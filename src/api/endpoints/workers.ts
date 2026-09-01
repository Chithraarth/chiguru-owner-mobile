import { apiFetch, apiMutate } from "../client";
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

// Saves/updates a worker's reference photo, used to match faces for the
// Single Person Face Attendance flow. Separate from faceDescriptor, which
// keeps its own validation branch server-side that this doesn't touch.
export function setWorkerPhoto(workerId: number, photoDataUrl: string) {
  return apiMutate<Worker>("PATCH", `/workers/${workerId}`, { photoUrl: photoDataUrl }, { mediaTimeout: true });
}

// Compares a freshly-captured photo against every active worker's saved
// reference photo via Gemini vision (POST /workers/face-match). Uses
// apiFetch, not apiMutate: there's nothing meaningful to replay from an
// offline queue for a one-off match result, so a network/5xx failure must
// throw and let the caller show a retry prompt instead of being silently
// queued.
export function matchFace(imageBase64: string) {
  return apiFetch<{ matchedWorkerId: number | null; matchedWorkerName: string | null; confidence: string; message?: string }>(
    "/workers/face-match",
    { method: "POST", body: JSON.stringify({ imageBase64 }), mediaTimeout: true }
  );
}
