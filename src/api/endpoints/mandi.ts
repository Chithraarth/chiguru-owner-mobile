import { apiFetch, apiMutate } from "../client";
import type { MandiPricesResponse } from "../../types/api";

export function getMandiPrices(query?: string) {
  const q = query ? `?q=${encodeURIComponent(query)}` : "";
  return apiFetch<MandiPricesResponse>(`/mandi/prices${q}`);
}

export function refreshMandiPrices() {
  return apiMutate<{ date: string; status: string }>("POST", "/mandi/refresh");
}
