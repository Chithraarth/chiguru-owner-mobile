import { apiFetch, apiMutate } from "../client";
import type { CreatePlanTaskRequest, PlanTask } from "../../types/api";

export function getPlanTasks() {
  return apiFetch<PlanTask[]>("/plan-tasks");
}

export function createPlanTask(data: CreatePlanTaskRequest) {
  return apiMutate<PlanTask>("POST", "/plan-tasks", data);
}

export function updatePlanTask(id: number, data: Partial<CreatePlanTaskRequest> & { done?: boolean }) {
  return apiMutate<PlanTask>("PATCH", `/plan-tasks/${id}`, data);
}

export function deletePlanTask(id: number) {
  return apiMutate<null>("DELETE", `/plan-tasks/${id}`);
}

/** AI-generates the next 12 months of tasks. Requires trial/paid access (402 if not). */
export function generatePlanTasks() {
  return apiFetch<PlanTask[]>("/plan-tasks/generate", { method: "POST" });
}
