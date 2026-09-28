import { apiFetch, apiMutate } from "../../api/client";
import type {
  AdvancePayment,
  Attendance,
  CountWorkersResponse,
  CreateEstateUpdateRequest,
  CreateExpenseRequest,
  CreateWorkGroupRequest,
  Crop,
  EstateUpdate,
  Expense,
  ManagerMe,
  MarkAttendanceRequest,
  PlanTask,
  WorkGroup,
  Worker,
} from "./types";

// Every call the invitee screens make — the same set the old Manager app
// used, and the only estate routes the backend allows an invitee (see
// chiguru-backend's middlewares/inviteeAccess.ts).

export function getManagerMe() {
  return apiFetch<ManagerMe>("/manager/me");
}

export function getFarmCurrency() {
  return apiFetch<{ currency?: string }>("/farm/profile");
}

export function getCrops() {
  return apiFetch<Crop[]>("/crops");
}

export function getWorkers() {
  return apiFetch<Worker[]>("/workers");
}

export function getAttendanceByDate(date: string) {
  return apiFetch<Attendance[]>(`/attendance?date=${date}`);
}

export function getAttendanceByGroup(workGroupId: number) {
  return apiFetch<Attendance[]>(`/attendance?workGroupId=${workGroupId}`);
}

/** Idempotent server-side on (workGroupId, workerId, date) - safe to queue offline. */
export function markAttendance(data: MarkAttendanceRequest) {
  return apiMutate<Attendance>("POST", "/attendance", data);
}

export function getWorkGroups() {
  return apiFetch<WorkGroup[]>("/work-groups");
}

export function createWorkGroup(data: CreateWorkGroupRequest) {
  return apiMutate<WorkGroup>("POST", "/work-groups", data);
}

export function getAdvancePayments(workGroupId: number) {
  return apiFetch<AdvancePayment[]>(`/work-groups/${workGroupId}/advance-payments`);
}

export function countWorkersFromPhoto(imageBase64: string) {
  return apiFetch<CountWorkersResponse>("/ai/count-workers", {
    method: "POST",
    body: JSON.stringify({ imageBase64 }),
    mediaTimeout: true,
  });
}

export function getEstateUpdates(date: string) {
  return apiFetch<EstateUpdate[]>(`/estate-updates?date=${date}`);
}

/** Idempotent via clientId - safe to queue offline in the media-bearing queue. */
export function createEstateUpdate(data: CreateEstateUpdateRequest) {
  return apiMutate<EstateUpdate>("POST", "/estate-updates", data, {
    queueTable: "estate_updates_queue",
    clientId: data.clientId,
    mediaTimeout: true,
  });
}

export function countWorkersInUpdatePhoto(imageDataUrl: string) {
  return apiFetch<CountWorkersResponse>("/estate-updates/count-workers", {
    method: "POST",
    body: JSON.stringify({ imageDataUrl }),
    mediaTimeout: true,
  });
}

export function getPlanTasks() {
  return apiFetch<PlanTask[]>("/plan-tasks");
}

export function getExpenses() {
  return apiFetch<Expense[]>("/expenses");
}

export function getExpenseReceipt(id: number) {
  return apiFetch<{ receiptUrl: string }>(`/expenses/${id}/receipt`, { mediaTimeout: true });
}

/**
 * Not idempotent server-side (no clientId support) - sent directly and never
 * queued offline, since a retried queue write could double-record money.
 */
export function createExpense(data: CreateExpenseRequest) {
  return apiFetch<Expense>("/expenses", { method: "POST", body: JSON.stringify(data), mediaTimeout: true });
}
