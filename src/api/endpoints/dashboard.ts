import { apiFetch } from "../client";
import type { DashboardSummary, RecentAd } from "../../types/api";

export function getDashboardSummary() {
  return apiFetch<DashboardSummary>("/dashboard/summary");
}

export function getRecentAds(limit = 6) {
  return apiFetch<RecentAd[]>(`/ads/recent?limit=${limit}`);
}
