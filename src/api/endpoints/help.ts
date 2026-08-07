import { apiFetch, apiMutate } from "../client";
import type { HelpMessage } from "../../types/api";

export function getHelpMessages() {
  return apiFetch<HelpMessage[]>("/help-messages");
}

export function postHelpMessage(type: "question" | "suggestion", message: string, phone?: string) {
  return apiMutate<HelpMessage>("POST", "/help-messages", { type, message, phone: phone || undefined });
}
