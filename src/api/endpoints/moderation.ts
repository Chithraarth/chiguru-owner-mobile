import { apiFetch } from "../client";

export type ReportBoard = "produce" | "equipment" | "hire";
export type ReportReason = "spam" | "misleading" | "offensive" | "illegal" | "other";

/** Reports a listing (and optionally blocks its poster). It is hidden for this phone straight away. */
export function reportListing(data: { board: ReportBoard; listingId: number; reason: ReportReason; details?: string; block: boolean }) {
  return apiFetch<{ ok: true; blocked: boolean }>("/content/report", { method: "POST", body: JSON.stringify(data) });
}
