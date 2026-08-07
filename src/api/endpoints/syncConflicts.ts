import { apiFetch } from "../client";
import type { SyncConflict } from "../../types/api";

export function getSyncConflicts() {
  return apiFetch<SyncConflict[]>("/sync-conflicts");
}
