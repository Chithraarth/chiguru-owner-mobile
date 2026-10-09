import { apiFetch, apiMutate } from "../client";
import type { Agronomist, AppSettings, RegisterAgronomistRequest } from "../../types/api";

export function getAgronomists() {
  return apiFetch<Agronomist[]>("/agronomists");
}

export function getAgronomist(id: number) {
  return apiFetch<Agronomist>(`/agronomists/${id}`);
}

export function registerAgronomist(data: RegisterAgronomistRequest) {
  return apiMutate<Agronomist>("POST", "/agronomists", data);
}

export function getAppSettings() {
  return apiFetch<AppSettings>("/app-settings");
}

/** One-time wallet payment that reveals every doctor's number. */
export function unlockDoctorContacts() {
  return apiFetch<{ unlocked: boolean; charged: number; balance?: number }>("/agronomists/contacts/unlock", { method: "POST" });
}
