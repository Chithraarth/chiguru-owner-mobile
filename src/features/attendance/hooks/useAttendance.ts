import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdvancePayments,
  getAttendanceByDate,
  getWorkers,
  markAttendance,
} from "../../../api/endpoints/attendance";
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
  };
}
