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
  // May carry a base64 proof-of-loan photo (proofPhotoUrl) - use the longer
  // media timeout so a slow upload doesn't get mistaken for offline.
  return apiMutate<Loan>("POST", "/loans", data, { mediaTimeout: true });
}

export function deleteLoan(id: number) {
  return apiMutate<null>("DELETE", `/loans/${id}`);
}

export function createLoanPayment(loanId: number, data: CreateLoanPaymentRequest) {
  return apiMutate<LoanPayment>("POST", "/loan-payments", { loanId, ...data });
}
