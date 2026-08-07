import { apiFetch, apiMutate } from "../client";
import type { Manager } from "../../types/api";

export function getManagers() {
  return apiFetch<Manager[]>("/managers");
}

export function inviteManager(name: string, phone: string) {
  return apiMutate<Manager>("POST", "/managers", { name, phone });
}

export function removeManager(id: number) {
  return apiMutate<null>("DELETE", `/managers/${id}`);
}
