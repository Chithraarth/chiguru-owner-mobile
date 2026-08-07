import { apiFetch, apiMutate } from "../client";
import type { CreateHarvestRequest, Harvest } from "../../types/api";

export function getHarvests() {
  return apiFetch<Harvest[]>("/harvests");
}

export function createHarvest(data: CreateHarvestRequest) {
  return apiMutate<Harvest>("POST", "/harvests", data);
}

export function deleteHarvest(id: number) {
  return apiMutate<null>("DELETE", `/harvests/${id}`);
}
