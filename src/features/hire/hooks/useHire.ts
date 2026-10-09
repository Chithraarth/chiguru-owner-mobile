import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createHireListing, deleteHireListing, getHireListings, updateHireListing } from "../../../api/endpoints/hire";
import type { CreateHireListingRequest } from "../../../types/api";

export function useHire(listingType?: "rental" | "job") {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["hire-listings", listingType ?? "all"],
    queryFn: () => getHireListings(listingType),
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<CreateHireListingRequest, "ownerKey">) => createHireListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hire-listings"] });
      // The Shop list and home "Recent ads" are built from the same ads.
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      queryClient.invalidateQueries({ queryKey: ["recent-ads"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Omit<CreateHireListingRequest, "ownerKey"> }) =>
      updateHireListing(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hire-listings"] });
      // The Shop list and home "Recent ads" are built from the same ads.
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      queryClient.invalidateQueries({ queryKey: ["recent-ads"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteHireListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hire-listings"] });
      // The Shop list and home "Recent ads" are built from the same ads.
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      queryClient.invalidateQueries({ queryKey: ["recent-ads"] });
    },
  });

  return { ...query, createListing: createMutation, updateListing: updateMutation, deleteListing: deleteMutation };
}
