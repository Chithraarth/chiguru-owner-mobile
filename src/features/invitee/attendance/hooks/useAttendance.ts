import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAttendanceByDate,
  getWorkers,
  markAttendance,
} from "../../api";
import { getWorkGroups, createWorkGroup, getAdvancePayments } from "../../api";
import { useEstateStore } from "../../../estate/store/estateStore";
import type { CreateWorkGroupRequest, MarkAttendanceRequest } from "../../types";

function todayIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function useWorkGroups() {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["work-groups", activeEstateId],
    queryFn: getWorkGroups,
    enabled: activeEstateId != null,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateWorkGroupRequest) => createWorkGroup(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["work-groups", activeEstateId] }),
  });

  return { ...query, createWorkGroup: createMutation };
}

export function useAttendance() {
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

  const markMutation = useMutation({
    mutationFn: (data: MarkAttendanceRequest) => markAttendance(data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["attendance", activeEstateId, date] }),
  });

  return {
    date,
    workers: workersQuery.data ?? [],
    attendance: attendanceQuery.data ?? [],
    isLoading: workersQuery.isLoading || attendanceQuery.isLoading,
    refetch: () => {
      workersQuery.refetch();
      attendanceQuery.refetch();
    },
    markAttendance: markMutation,
  };
}

export function useAdvancePayments(workGroupId: number | null) {
  return useQuery({
    queryKey: ["advance-payments", workGroupId],
    queryFn: () => getAdvancePayments(workGroupId!),
    enabled: !!workGroupId,
  });
}
