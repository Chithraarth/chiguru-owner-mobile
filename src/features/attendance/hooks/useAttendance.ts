import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdvancePayments,
  getAttendanceByDate,
  getWorkers,
  markAttendance,
} from "../../../api/endpoints/attendance";
import {
  getHarvestBonusSummary,
  getOvertimeSummary,
  settleHarvestBonus,
  settleOvertime,
  updateWorkGroup,
} from "../../../api/endpoints/workGroups";
import { newClientId } from "../../../lib/idempotency";
import { useEstateStore } from "../../estate/store/estateStore";
import type { MarkAttendanceRequest } from "../../../types/api";

function todayIso(): string {
  const d = new Date();
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

export function useAttendance(workGroupId: number) {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const queryClient = useQueryClient();
  const date = todayIso();

  const workersQuery = useQuery({
    queryKey: ["workers", activeEstateId],
    queryFn: getWorkers,
    enabled: activeEstateId != null,
  });

  const attendanceQuery = useQuery({
    queryKey: ["attendance", activeEstateId, date],
    queryFn: () => getAttendanceByDate(date),
    enabled: activeEstateId != null,
  });

  const advanceQuery = useQuery({
    queryKey: ["advance-payments", workGroupId],
    queryFn: () => getAdvancePayments(workGroupId),
    enabled: !!workGroupId,
  });

  const markMutation = useMutation({
    mutationFn: (data: MarkAttendanceRequest) => markAttendance(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", activeEstateId, date] });
    },
  });

  const overtimeSummaryQuery = useQuery({
    queryKey: ["overtime-summary", workGroupId],
    queryFn: () => getOvertimeSummary(workGroupId),
    enabled: !!workGroupId,
  });

  const harvestBonusSummaryQuery = useQuery({
    queryKey: ["harvest-bonus-summary", workGroupId],
    queryFn: () => getHarvestBonusSummary(workGroupId),
    enabled: !!workGroupId,
  });

  const settleOvertimeMutation = useMutation({
    mutationFn: () => settleOvertime(workGroupId, newClientId()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overtime-summary", workGroupId] });
      queryClient.invalidateQueries({ queryKey: ["advance-payments", workGroupId] });
    },
  });

  const settleHarvestBonusMutation = useMutation({
    mutationFn: () => settleHarvestBonus(workGroupId, newClientId()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["harvest-bonus-summary", workGroupId] });
      queryClient.invalidateQueries({ queryKey: ["advance-payments", workGroupId] });
    },
  });

  // Used both for the settlement-frequency picker (weekly/monthly/final) and
  // for saving the harvest picking-bonus rule (threshold + pay/kg) - mirrors
  // the web app's single PATCH /work-groups/:id for both.
  const updateWorkGroupMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateWorkGroup>[1]) => updateWorkGroup(workGroupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overtime-summary", workGroupId] });
      queryClient.invalidateQueries({ queryKey: ["harvest-bonus-summary", workGroupId] });
      queryClient.invalidateQueries({ queryKey: ["work-groups", activeEstateId] });
    },
  });

  return {
    date,
    workers: workersQuery.data ?? [],
    attendance: attendanceQuery.data ?? [],
    advancePayments: advanceQuery.data ?? [],
    isLoading: workersQuery.isLoading || attendanceQuery.isLoading,
    refetch: () => {
      workersQuery.refetch();
      attendanceQuery.refetch();
    },
    markAttendance: markMutation,
    overtimeSummary: overtimeSummaryQuery.data,
    harvestBonusSummary: harvestBonusSummaryQuery.data,
    settleOvertime: settleOvertimeMutation,
    settleHarvestBonus: settleHarvestBonusMutation,
    updateWorkGroup: updateWorkGroupMutation,
  };
}
