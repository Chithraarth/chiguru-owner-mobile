import { apiFetch, apiMutate } from "../client";
import type {
  BackupCodeResponse,
  Estate,
  FarmProfile,
  RestoreResponse,
} from "../../types/api";

export function getEstates() {
  return apiFetch<Estate[]>("/estates");
}

export function createEstate(data: {
  farmName: string;
  village?: string;
  district?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  totalAcres?: number;
}) {
  return apiMutate<Estate>("POST", "/estates", data);
}

export function renameEstate(id: number, farmName: string) {
  return apiMutate<Estate>("PATCH", `/estates/${id}`, { farmName });
}

export function deleteEstate(id: number) {
  return apiMutate<null>("DELETE", `/estates/${id}`);
}

export function getFarmProfile() {
  // 404s when the active estate has no profile yet - callers should catch
  // and treat as "not set up", not a hard error.
  return apiFetch<FarmProfile>("/farm/profile");
}

export function updateFarmProfile(data: Partial<FarmProfile>) {
  return apiMutate<FarmProfile>("PATCH", "/farm/profile", data);
}

export function getBackupCode() {
  return apiFetch<BackupCodeResponse>("/backup/code");
}

export function restoreBackup(code: string) {
  return apiMutate<RestoreResponse>("POST", "/backup/restore", { code });
}
