import { apiFetch, apiMutate } from "../client";
import type { Manager, PendingInvite } from "../../types/api";

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

/** Invites addressed to the signed-in person, awaiting Accept/Decline. */
export function getMyInvites() {
  return apiFetch<PendingInvite[]>("/me/invites");
}

export function acceptInvite(id: number) {
  return apiMutate<Manager>("POST", `/me/invites/${id}/accept`);
}

export function declineInvite(id: number) {
  return apiMutate<null>("POST", `/me/invites/${id}/decline`);
}
