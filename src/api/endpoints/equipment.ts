import { apiFetch, apiMutate } from "../client";
import { getOrCreateOwnerKey } from "../../lib/ownerKey";
import type { CreateEquipmentListingRequest, EquipmentListing } from "../../types/api";

export function getEquipmentListings(category?: string, condition?: string) {
  const params = new URLSearchParams();
  if (category && category !== "all") params.set("category", category);
  if (condition && condition !== "all") params.set("condition", condition);
  const q = params.toString();
  return apiFetch<EquipmentListing[]>(`/equipment-listings${q ? `?${q}` : ""}`);
}

export async function getMyEquipmentListings() {
  const ownerKey = await getOrCreateOwnerKey();
  return apiFetch<EquipmentListing[]>("/equipment-listings?mine=1", {
    headers: { "X-Owner-Key": ownerKey },
  });
}

export async function createEquipmentListing(data: Omit<CreateEquipmentListingRequest, "ownerKey">) {
  const ownerKey = await getOrCreateOwnerKey();
  return apiMutate<EquipmentListing>("POST", "/equipment-listings", { ...data, ownerKey });
}

export async function deleteEquipmentListing(id: number) {
  const ownerKey = await getOrCreateOwnerKey();
  return apiMutate<null>("DELETE", `/equipment-listings/${id}`, undefined, {
    extraHeaders: { "X-Owner-Key": ownerKey },
  });
}
