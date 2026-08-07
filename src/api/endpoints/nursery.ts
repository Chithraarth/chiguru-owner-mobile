import { apiFetch, apiMutate } from "../client";
import type { NurseryListing, NurseryVendor } from "../../types/api";

export function getNurseryVendors() {
  return apiFetch<NurseryVendor[]>("/nursery/vendors");
}

// Admin view: every vendor regardless of approval status (pending/approved/suspended).
export function getAllNurseryVendors() {
  return apiFetch<NurseryVendor[]>("/nursery/vendors?all=true");
}

export function getNurseryVendorDetail(id: number) {
  return apiFetch<NurseryVendor>(`/nursery/vendors/${id}`);
}

export function updateNurseryVendor(id: number, data: Partial<Pick<NurseryVendor, "status" | "isActive" | "adminNotes">>) {
  return apiMutate<NurseryVendor>("PATCH", `/nursery/vendors/${id}`, data);
}

export function deleteNurseryVendor(id: number) {
  return apiMutate<null>("DELETE", `/nursery/vendors/${id}`);
}

export function deleteNurseryListing(id: number) {
  return apiMutate<null>("DELETE", `/nursery/listings/${id}`);
}

export function submitNurseryRating(vendorId: number, rating: number, comment?: string) {
  return apiMutate<{ id: number }>("POST", `/nursery/vendors/${vendorId}/ratings`, { rating, comment });
}

export function getNurseryListings(category?: string, vendorId?: number) {
  const params = new URLSearchParams();
  if (category && category !== "all") params.set("category", category);
  if (vendorId) params.set("vendorId", String(vendorId));
  const q = params.toString();
  return apiFetch<NurseryListing[]>(`/nursery/listings${q ? `?${q}` : ""}`);
}
