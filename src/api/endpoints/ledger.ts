import { apiFetch } from "../client";
import type { OldLedgerYearDetail, OldLedgerYearSummary } from "../../types/api";

export function getOldLedgerYears() {
  return apiFetch<OldLedgerYearSummary[]>("/ledger/old-years");
}

export function getOldLedgerYear(year: number) {
  return apiFetch<OldLedgerYearDetail>(`/ledger/old-years/${year}`);
}
