import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEquipmentListing,
  deleteEquipmentListing,
  getEquipmentListings,
} from "../../../api/endpoints/equipment";
import type { CreateEquipmentListingRequest } from "../../../types/api";

export function useEquipment() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["equipment-listings"],
    queryFn: () => getEquipmentListings(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<CreateEquipmentListingRequest, "ownerKey">) => createEquipmentListing(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["equipment-listings"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEquipmentListing(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["equipment-listings"] }),
  });

  return { ...query, createListing: createMutation, deleteListing: deleteMutation };
}
