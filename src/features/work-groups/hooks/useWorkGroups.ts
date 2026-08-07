import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createWorkGroup, deleteWorkGroup, getWorkGroups } from "../../../api/endpoints/workGroups";
import { useEstateStore } from "../../estate/store/estateStore";
import type { CreateWorkGroupRequest } from "../../../types/api";

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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteWorkGroup(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["work-groups", activeEstateId] }),
  });

  return { ...query, createWorkGroup: createMutation, deleteWorkGroup: deleteMutation };
}
