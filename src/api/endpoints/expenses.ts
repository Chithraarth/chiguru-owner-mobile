import { apiFetch, apiMutate } from "../client";
import type { CreateExpenseRequest, Expense, ExpenseReceiptResponse } from "../../types/api";

export function getExpenses() {
  return apiFetch<Expense[]>("/expenses");
}

export function getExpenseReceipt(id: number) {
  return apiFetch<ExpenseReceiptResponse>(`/expenses/${id}/receipt`, { mediaTimeout: true });
}

export function createExpense(data: CreateExpenseRequest) {
  // Not idempotent server-side (no clientId support on this table) - queued
  // retries could double-charge, so this is only ever called when online;
  // see features/expenses/hooks/useExpenses.ts for the online-only guard.
  return apiMutate<Expense>("POST", "/expenses", data, { mediaTimeout: true });
}

export function deleteExpense(id: number) {
  return apiMutate<null>("DELETE", `/expenses/${id}`);
}
