import { apiFetch, apiMutate } from "../client";
import type { Manager } from "../../types/api";

export function getManagers() {
  return apiFetch<Manager[]>("/managers");
}

/** Invite by phone OR email — pass whichever one the owner entered. */
export function inviteManager(name: string, contact: { phone?: string; email?: string }) {
  return apiMutate<Manager>("POST", "/managers", { name, ...contact });
}

export function removeManager(id: number) {
  return apiMutate<null>("DELETE", `/managers/${id}`);
}
