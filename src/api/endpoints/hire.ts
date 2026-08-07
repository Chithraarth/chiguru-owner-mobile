import { apiFetch, apiMutate } from "../client";
import { getOrCreateOwnerKey } from "../../lib/ownerKey";
import type { CreateHireListingRequest, HireListing } from "../../types/api";

export function getHireListings(listingType?: "rental" | "job") {
  // Backend filters on `type`, not `listingType` — matching the query param
  // name the server actually reads (hire.ts) avoids silently fetching everything.
  const q = listingType ? `?type=${listingType}` : "";
  return apiFetch<HireListing[]>(`/hire-listings${q}`);
}

export async function getMyHireListings() {
  const ownerKey = await getOrCreateOwnerKey();
  return apiFetch<HireListing[]>("/hire-listings?mine=1", {
    headers: { "X-Owner-Key": ownerKey },
  });
}

export async function createHireListing(data: Omit<CreateHireListingRequest, "ownerKey">) {
  const ownerKey = await getOrCreateOwnerKey();
  return apiMutate<HireListing>("POST", "/hire-listings", { ...data, ownerKey });
}

export async function updateHireListing(id: number, data: Omit<CreateHireListingRequest, "ownerKey">) {
  const ownerKey = await getOrCreateOwnerKey();
  return apiMutate<HireListing>("PATCH", `/hire-listings/${id}`, { ...data, ownerKey });
}

export async function deleteHireListing(id: number) {
  const ownerKey = await getOrCreateOwnerKey();
  return apiMutate<null>("DELETE", `/hire-listings/${id}`, undefined, {
    extraHeaders: { "X-Owner-Key": ownerKey },
  });
}
