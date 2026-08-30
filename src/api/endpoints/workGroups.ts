import { apiFetch, apiMutate } from "../client";
import type {
  AddWorkSessionUpdatePhotoRequest,
  AdvancePayment,
  CheckoutWorkSessionRequest,
  ClearWorkGroupResult,
  CountWorkersResponse,
  CreateAdvancePaymentRequest,
  CreateWorkGroupRequest,
  CreateWorkSessionRequest,
  HarvestBonusSummary,
  OvertimeSummary,
  SettleResult,
  WorkGroup,
  WorkSession,
} from "../../types/api";

export function getWorkGroups() {
  return apiFetch<WorkGroup[]>("/work-groups");
}

export function createWorkGroup(data: CreateWorkGroupRequest) {
  return apiMutate<WorkGroup>("POST", "/work-groups", data);
}

export function deleteWorkGroup(id: number) {
  return apiMutate<null>("DELETE", `/work-groups/${id}`);
}

export function updateWorkGroup(id: number, data: Partial<WorkGroup>) {
  return apiMutate<WorkGroup>("PATCH", `/work-groups/${id}`, data);
}

// Archive a fully-settled work group into Accounts history. Idempotent on the
// server: a second press keeps the original cleared date.
export function clearWorkGroup(id: number) {
  return apiMutate<ClearWorkGroupResult>("POST", `/work-groups/${id}/clear`);
}

export function getOvertimeSummary(workGroupId: number) {
  return apiFetch<OvertimeSummary>(`/work-groups/${workGroupId}/overtime-summary`);
}

export function settleOvertime(workGroupId: number, clientId: string) {
  return apiMutate<SettleResult>("POST", `/work-groups/${workGroupId}/overtime/settle`, { clientId });
}

export function getHarvestBonusSummary(workGroupId: number) {
  return apiFetch<HarvestBonusSummary>(`/work-groups/${workGroupId}/harvest-bonus-summary`);
}

export function settleHarvestBonus(workGroupId: number, clientId: string) {
  return apiMutate<SettleResult>("POST", `/work-groups/${workGroupId}/harvest-bonus/settle`, { clientId });
}

export function countWorkersFromPhoto(imageBase64: string) {
  // No auth/estate headers on the web app for this endpoint; kept consistent.
  return apiFetch<CountWorkersResponse>("/ai/count-workers", {
    method: "POST",
    body: JSON.stringify({ imageBase64 }),
    mediaTimeout: true,
  });
}

// ── Work sessions (check-in / work photos / check-out) ──────────────────────

/** `date` as "YYYY-MM-DD"; omit for all sessions of the group. */
export function getWorkSessions(workGroupId: number, date?: string) {
  const q = date ? `?date=${date}` : "";
  return apiFetch<WorkSession[]>(`/work-groups/${workGroupId}/sessions${q}`);
}

// Idempotent per group+date on the server: an open session for the day is
// reused (and its headcount/photo patched in), never duplicated.
export function createOrUpdateWorkSession(workGroupId: number, data: CreateWorkSessionRequest) {
  return apiMutate<WorkSession>("POST", `/work-groups/${workGroupId}/sessions`, data, { mediaTimeout: true });
}

// Max 2 update-photos per session, enforced server-side too.
export function addWorkSessionUpdatePhoto(sessionId: number, data: AddWorkSessionUpdatePhotoRequest) {
  return apiMutate<WorkSession>("POST", `/work-sessions/${sessionId}/update-photo`, data, { mediaTimeout: true });
}

export function checkoutWorkSession(sessionId: number, data: CheckoutWorkSessionRequest) {
  return apiMutate<WorkSession>("POST", `/work-sessions/${sessionId}/checkout`, data, { mediaTimeout: true });
}

// ── Advance payments ─────────────────────────────────────────────────────────

export function createAdvancePayment(workGroupId: number, data: CreateAdvancePaymentRequest) {
  return apiMutate<AdvancePayment>("POST", `/work-groups/${workGroupId}/advance-payments`, data);
}

export function deleteAdvancePayment(workGroupId: number, payId: number) {
  return apiMutate<null>("DELETE", `/work-groups/${workGroupId}/advance-payments/${payId}`);
}
