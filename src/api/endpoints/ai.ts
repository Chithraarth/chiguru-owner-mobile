import { apiFetch, apiMutate, apiUrl, buildHeaders } from "../client";
import type { ChatMessage, Conversation, DiagnosisResult } from "../../types/api";

export function getConversations() {
  return apiFetch<Conversation[]>("/openai/conversations");
}

export function getConversationMessages(id: number) {
  return apiFetch<ChatMessage[]>(`/openai/conversations/${id}/messages`);
}

export function createConversation(title: string) {
  return apiMutate<Conversation>("POST", "/openai/conversations", { title });
}

export function deleteConversation(id: number) {
  return apiMutate<null>("DELETE", `/openai/conversations/${id}`);
}

/**
 * Streams the AI reply token-by-token via SSE. RN's fetch doesn't expose a
 * readable byte stream the way browsers do on all engines, so this reads the
 * response as text once it completes and parses the `data: {...}` frames -
 * simpler and reliable, at the cost of not showing partial tokens as they
 * arrive. Calls onDone with the full assembled reply.
 */
export async function sendChatMessage(
  conversationId: number,
  content: string,
  onDone: (fullText: string) => void,
  onError: (message: string) => void
) {
  try {
    const headers = await buildHeaders({ Accept: "text/event-stream" });
    const res = await fetch(apiUrl(`/openai/conversations/${conversationId}/messages`), {
      method: "POST",
      headers,
      body: JSON.stringify({ content }),
    });
    const text = await res.text();
    let full = "";
    for (const line of text.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr) continue;
      try {
        const evt = JSON.parse(jsonStr);
        if (evt.content) full += evt.content;
        if (evt.error) {
          onError(evt.error);
          return;
        }
      } catch {
        // ignore malformed frame
      }
    }
    onDone(full);
  } catch (err) {
    onError(err instanceof Error ? err.message : "AI service error");
  }
}

export function statelessChat(message: string, cropType?: string) {
  return apiFetch<{ response: string; farmContextAvailable: boolean }>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, cropType }),
  });
}

export function diagnoseDisease(imageBase64: string, cropType?: string) {
  return apiFetch<DiagnosisResult>("/ai/disease", {
    method: "POST",
    body: JSON.stringify({ imageBase64, cropType }),
    mediaTimeout: true,
  });
}

export function submitDiagnosisOutcome(
  id: number,
  outcome: "helpful" | "not-helpful" | "agronomist-confirmed",
  outcomeNote?: string
) {
  return apiMutate<null>("PATCH", `/ai/disease/${id}/outcome`, { outcome, outcomeNote });
}

export interface AccountsScanEntry {
  type: "expense" | "income";
  category: string;
  description: string;
  originalText: string;
  amount: number;
  date?: string;
  unit?: string;
  confidence: "high" | "medium" | "low";
  question?: string;
}

export interface AccountsScanResult {
  year?: number;
  pageDescription?: string;
  entries: AccountsScanEntry[];
  totalExpense: number;
  totalIncome: number;
  notes?: string;
}

export function scanAccountsPage(imageBase64: string) {
  return apiFetch<AccountsScanResult>("/ai/accounts-scan", {
    method: "POST",
    body: JSON.stringify({ imageBase64 }),
    mediaTimeout: true,
  });
}
