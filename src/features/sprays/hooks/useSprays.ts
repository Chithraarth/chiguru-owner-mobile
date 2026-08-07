import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSpray, deleteSpray, getSprays } from "../../../api/endpoints/sprays";
import { createCrop, getCrops } from "../../../api/endpoints/crops";
import { useEstateStore } from "../../estate/store/estateStore";
import type { CreateSprayRequest } from "../../../types/api";

export function useSprays() {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sprays", activeEstateId],
    queryFn: getSprays,
    enabled: activeEstateId != null,
  });

  const cropsQuery = useQuery({
    queryKey: ["crops", activeEstateId],
    queryFn: getCrops,
    enabled: activeEstateId != null,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSprayRequest) => createSpray(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sprays", activeEstateId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSpray(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sprays", activeEstateId] }),
  });

  const createCropMutation = useMutation({
    mutationFn: (name: string) => createCrop({ name, acres: 0, season: "Annual" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crops", activeEstateId] }),
  });

  return {
    ...query,
    crops: cropsQuery.data ?? [],
    createSpray: createMutation,
    deleteSpray: deleteMutation,
    createCrop: createCropMutation,
  };
}
