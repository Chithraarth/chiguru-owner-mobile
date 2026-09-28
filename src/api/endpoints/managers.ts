import { apiFetch, apiMutate } from "../client";

// Invite, accept and decline are sent directly, never queued offline: none of
// them is idempotent, and the person needs to know right away if it failed.
import type { Manager, PendingInvite } from "../../types/api";

export function getManagers() {
  return apiFetch<Manager[]>("/managers");
}

/** Invite by phone OR email to one of your estates — pass whichever contact the owner entered. */
export function inviteManager(name: string, contact: { phone?: string; email?: string }, estateId: number) {
  return apiFetch<Manager>("/managers", { method: "POST", body: JSON.stringify({ name, estateId, ...contact }) });
}

export function removeManager(id: number) {
  return apiMutate<null>("DELETE", `/managers/${id}`);
}

/** Invites addressed to the signed-in person, awaiting Accept/Decline. */
export function getMyInvites() {
  return apiFetch<PendingInvite[]>("/me/invites");
}

export function acceptInvite(id: number) {
  return apiFetch<Manager>(`/me/invites/${id}/accept`, { method: "POST" });
}

export function declineInvite(id: number) {
  return apiFetch<null>(`/me/invites/${id}/decline`, { method: "POST" });
}
