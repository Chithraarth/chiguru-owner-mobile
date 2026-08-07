import { apiFetch, apiMutate } from "../client";
import type { CountWorkersResponse, CreateEstateUpdateRequest, EstateUpdate } from "../../types/api";

export function getEstateUpdates(date: string) {
  return apiFetch<EstateUpdate[]>(`/estate-updates?date=${date}`);
}

export function createEstateUpdate(data: CreateEstateUpdateRequest) {
  return apiMutate<EstateUpdate>("POST", "/estate-updates", data, {
    queueTable: "estate_updates_queue",
    clientId: data.clientId,
    mediaTimeout: true,
  });
}

export function deleteEstateUpdate(id: number) {
  return apiMutate<null>("DELETE", `/estate-updates/${id}`);
}

export function countWorkersInUpdatePhoto(imageDataUrl: string) {
  return apiFetch<CountWorkersResponse>("/estate-updates/count-workers", {
    method: "POST",
    body: JSON.stringify({ imageDataUrl }),
    mediaTimeout: true,
  });
}
