import { apiFetch, apiMutate } from "../client";
import type { CreateWorkerPaymentRequest, WorkerPayment } from "../../types/api";

export function getWorkerPayments(workGroupId?: number) {
  const qs = workGroupId != null ? `?workGroupId=${workGroupId}` : "";
  return apiFetch<WorkerPayment[]>(`/worker-payments${qs}`);
}

export function createWorkerPayment(data: CreateWorkerPaymentRequest) {
  // clientId makes a retried/queued submit idempotent server-side - never
  // double-record a money payment.
  return apiMutate<WorkerPayment>("POST", "/worker-payments", data);
}

export function deleteWorkerPayment(id: number) {
  return apiMutate<null>("DELETE", `/worker-payments/${id}`);
}
