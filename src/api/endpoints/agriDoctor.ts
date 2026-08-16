import { apiFetch, apiMutate } from "../client";
import type {
  AgriDoctorEndResult,
  Agronomist,
  AgronomistEarnings,
  AppSettings,
  Consultation,
  ConsultationMessage,
  RegisterAgronomistRequest,
} from "../../types/api";

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

export function topUpWallet(amount: number) {
  return apiMutate<{ walletBalance: string }>("POST", "/app-settings/wallet/topup", { amount });
}

export function getConsultations() {
  return apiFetch<Consultation[]>("/consultations");
}

export function startConsultation(agronomistId: number, mode: "chat" | "call", topic?: string) {
  return apiMutate<Consultation>("POST", "/consultations", { agronomistId, mode, topic });
}

export function getConsultationMessages(id: number) {
  return apiFetch<ConsultationMessage[]>(`/consultations/${id}/messages`);
}

export function sendConsultationMessage(
  id: number,
  text: string,
  media?: { mediaType: "image" | "audio"; mediaUrl: string }
) {
  return apiMutate<ConsultationMessage>(
    "POST",
    `/consultations/${id}/messages`,
    { text, ...media },
    { mediaTimeout: true }
  );
}

export function endConsultation(id: number) {
  return apiMutate<AgriDoctorEndResult>("POST", `/consultations/${id}/end`);
}

export function getAgronomistEarnings(id: number) {
  return apiFetch<AgronomistEarnings>(`/agronomists/${id}/earnings`);
}

export function requestPayout(id: number, amount: number) {
  return apiMutate<null>("POST", `/agronomists/${id}/payouts`, { amount });
}

export function markPayoutPaid(id: number, payoutId: number) {
  return apiMutate<null>("POST", `/agronomists/${id}/payouts/${payoutId}/paid`, {});
}
