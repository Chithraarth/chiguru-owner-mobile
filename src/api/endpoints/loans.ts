import { apiFetch, apiMutate } from "../client";
import type { CreateLoanPaymentRequest, CreateLoanRequest, GroupLoan, Loan, LoanPayment } from "../../types/api";

export function getLoans() {
  return apiFetch<Loan[]>("/loans");
}

// Loans belonging to a work group's folder (tagged directly to the group, or
// carried by a worker who has attendance in that group).
export function getGroupLoans(workGroupId: number) {
  return apiFetch<GroupLoan[]>(`/work-groups/${workGroupId}/loans`);
}

export function createLoan(data: CreateLoanRequest) {
  return apiMutate<Loan>("POST", "/loans", data);
}

export function deleteLoan(id: number) {
  return apiMutate<null>("DELETE", `/loans/${id}`);
}

export function createLoanPayment(loanId: number, data: CreateLoanPaymentRequest) {
  return apiMutate<LoanPayment>("POST", "/loan-payments", { loanId, ...data });
}
