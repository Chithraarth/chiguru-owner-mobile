import { apiFetch, apiMutate } from "../client";
import { getOrCreateOwnerKey } from "../../lib/ownerKey";
import type { CreateProduceListingRequest, ProduceListing } from "../../types/api";

export function getProduceListings(category?: string) {
  const q = category && category !== "all" ? `?category=${encodeURIComponent(category)}` : "";
  return apiFetch<ProduceListing[]>(`/produce-listings${q}`);
}

export async function getMyProduceListings() {
  const ownerKey = await getOrCreateOwnerKey();
  return apiFetch<ProduceListing[]>("/produce-listings?mine=1", {
    headers: { "X-Owner-Key": ownerKey },
  });
}

export async function createProduceListing(data: Omit<CreateProduceListingRequest, "ownerKey">) {
  const ownerKey = await getOrCreateOwnerKey();
  return apiMutate<ProduceListing>("POST", "/produce-listings", { ...data, ownerKey });
}

export async function deleteProduceListing(id: number) {
  const ownerKey = await getOrCreateOwnerKey();
  return apiMutate<null>("DELETE", `/produce-listings/${id}`, undefined, {
    extraHeaders: { "X-Owner-Key": ownerKey },
  });
}
