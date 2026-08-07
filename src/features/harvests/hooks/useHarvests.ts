import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createHarvest, deleteHarvest, getHarvests } from "../../../api/endpoints/harvests";
import { getCrops } from "../../../api/endpoints/crops";
import { useEstateStore } from "../../estate/store/estateStore";
import type { CreateHarvestRequest } from "../../../types/api";

export function useHarvests() {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["harvests", activeEstateId],
    queryFn: getHarvests,
    enabled: activeEstateId != null,
  });

  const cropsQuery = useQuery({
    queryKey: ["crops", activeEstateId],
    queryFn: getCrops,
    enabled: activeEstateId != null,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateHarvestRequest) => createHarvest(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["harvests", activeEstateId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteHarvest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["harvests", activeEstateId] }),
  });

  return {
    ...query,
    crops: cropsQuery.data ?? [],
    createHarvest: createMutation,
    deleteHarvest: deleteMutation,
  };
}
