import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEstateUpdate,
  deleteEstateUpdate,
  getEstateUpdates,
} from "../../../api/endpoints/estateUpdates";
import { useEstateStore } from "../../estate/store/estateStore";
import { newClientId } from "../../../lib/idempotency";
import type { CreateEstateUpdateRequest } from "../../../types/api";

function todayIso(): string {
  const d = new Date();
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

export function useEstateUpdates() {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const queryClient = useQueryClient();
  const date = todayIso();

  const query = useQuery({
    queryKey: ["estate-updates", activeEstateId, date],
    queryFn: () => getEstateUpdates(date),
    enabled: activeEstateId != null,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<CreateEstateUpdateRequest, "clientId" | "date">) =>
      createEstateUpdate({ ...data, date, clientId: newClientId() }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["estate-updates", activeEstateId, date] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEstateUpdate(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["estate-updates", activeEstateId, date] }),
  });

  return { ...query, date, createUpdate: createMutation, deleteUpdate: deleteMutation };
}
