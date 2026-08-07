import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCrop, deleteCrop, getCrops, mergeCrop, updateCrop } from "../../../api/endpoints/crops";
import { useEstateStore } from "../../estate/store/estateStore";
import type { CreateCropRequest } from "../../../types/api";

export function useCrops() {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["crops", activeEstateId],
    queryFn: getCrops,
    enabled: activeEstateId != null,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["crops", activeEstateId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", activeEstateId] });
  }

  const createMutation = useMutation({
    mutationFn: (data: CreateCropRequest) => createCrop(data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateCropRequest> }) => updateCrop(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCrop(id),
    onSuccess: invalidate,
  });

  const mergeMutation = useMutation({
    mutationFn: ({ id, intoId }: { id: number; intoId: number }) => mergeCrop(id, intoId),
    onSuccess: invalidate,
  });

  return {
    ...query,
    createCrop: createMutation,
    updateCrop: updateMutation,
    deleteCrop: deleteMutation,
    mergeCrop: mergeMutation,
  };
}
