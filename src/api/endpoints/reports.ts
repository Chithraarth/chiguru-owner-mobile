import { apiFetch } from "../client";
import type { MonthlyReport, SeasonReport, WeeklyReport } from "../../types/api";

export function getSeasonReport(startDate: string, endDate: string) {
  return apiFetch<SeasonReport>(`/reports/season?startDate=${startDate}&endDate=${endDate}`);
}

export function getMonthlyReport(month: string) {
  return apiFetch<MonthlyReport>(`/reports/monthly?month=${month}`);
}

export function getWeeklyReport(weekStart: string) {
  return apiFetch<WeeklyReport>(`/reports/weekly?weekStart=${weekStart}`);
}
