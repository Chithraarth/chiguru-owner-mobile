import { apiFetch, apiMutate } from "../client";
import type { CreateSprayRequest, Spray } from "../../types/api";

export function getSprays() {
  return apiFetch<Spray[]>("/sprays");
}

export function createSpray(data: CreateSprayRequest) {
  return apiMutate<Spray>("POST", "/sprays", data);
}

export function deleteSpray(id: number) {
  return apiMutate<null>("DELETE", `/sprays/${id}`);
}
