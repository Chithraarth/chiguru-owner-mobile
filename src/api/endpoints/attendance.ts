import { apiFetch, apiMutate } from "../client";
import type { AdvancePayment, Attendance, AttendanceRecord, MarkAttendanceRequest, Worker, WorkerMoney, WorkerWages } from "../../types/api";

export function getWorkers() {
  return apiFetch<Worker[]>("/workers");
}

// Every attendance row across all groups, joined with worker/group names -
// used by Labour Payments & Records to build its per-group folder totals.
export function getAllAttendance() {
  return apiFetch<AttendanceRecord[]>("/attendance");
}

export function getAttendanceByDate(date: string) {
  return apiFetch<Attendance[]>(`/attendance?date=${date}`);
}

export function getAttendanceByGroup(workGroupId: number) {
  return apiFetch<Attendance[]>(`/attendance?workGroupId=${workGroupId}`);
}

export function markAttendance(data: MarkAttendanceRequest) {
  // Idempotent server-side on (workGroupId, workerId, date) - safe to queue
  // offline without a clientId; a resend just upserts the same row.
  return apiMutate<Attendance>("POST", "/attendance", data);
}

export function getAdvancePayments(workGroupId: number) {
  return apiFetch<AdvancePayment[]>(`/work-groups/${workGroupId}/advance-payments`);
}

/** `month` as "YYYY-MM"; defaults server-side to the current month. */
export function getWorkerWages(workerId: number, month?: string) {
  const q = month ? `?month=${month}` : "";
  return apiFetch<WorkerWages>(`/workers/${workerId}/wages${q}`);
}

// All-time money summary for one worker (days worked, wages + overtime,
// harvest kg, loans, direct payments, netDue) — powers the per-employee
// drill-down on the Labour Records screen.
export function getWorkerMoney(workerId: number) {
  return apiFetch<WorkerMoney>(`/workers/${workerId}/money`);
}
