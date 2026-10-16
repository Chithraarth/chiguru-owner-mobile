import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProduceListing,
  deleteProduceListing,
  getMyProduceListings,
  getProduceListings,
} from "../../../api/endpoints/marketplace";
import type { CreateProduceListingRequest } from "../../../types/api";

export function useMarketplace(category?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["produce-listings", category ?? "all"],
    queryFn: () => getProduceListings(category),
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<CreateProduceListingRequest, "ownerKey">) => createProduceListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produce-listings"] });
      // The Shop list and home "Recent ads" are built from the same ads.
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      queryClient.invalidateQueries({ queryKey: ["recent-ads"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProduceListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produce-listings"] });
      // The Shop list and home "Recent ads" are built from the same ads.
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      queryClient.invalidateQueries({ queryKey: ["recent-ads"] });
    },
  });

  return { ...query, createListing: createMutation, deleteListing: deleteMutation };
}

export function useMyProduceListings() {
  return useQuery({ queryKey: ["produce-listings", "mine"], queryFn: getMyProduceListings });
}
