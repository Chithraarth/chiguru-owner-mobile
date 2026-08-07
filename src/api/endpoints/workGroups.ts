import { apiFetch, apiMutate } from "../client";
import type {
  CountWorkersResponse,
  CreateWorkGroupRequest,
  HarvestBonusSummary,
  OvertimeSummary,
  SettleResult,
  WorkGroup,
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
