import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteEstate, getEstates, renameEstate } from "../../../api/endpoints/estates";
import { useEstateStore } from "../store/estateStore";

export function useEstates() {
  const queryClient = useQueryClient();
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const hydrated = useEstateStore((s) => s.hydrated);
  const setActiveEstate = useEstateStore((s) => s.setActiveEstate);

  const query = useQuery({
    queryKey: ["estates"],
    queryFn: getEstates,
    enabled: hydrated,
  });

  // Self-heal: if the stored active estate no longer exists (e.g. deleted
  // from another device), fall back to the first available one - mirrors
  // the web app's EstateProvider.
  useEffect(() => {
    if (!query.data || query.data.length === 0) return;
    const stillExists = query.data.some((e) => e.id === activeEstateId);
    if (!stillExists) {
      setActiveEstate(query.data[0].id);
    }
  }, [query.data, activeEstateId, setActiveEstate]);

  async function switchEstate(id: number) {
    await setActiveEstate(id);
    // Switching farms refetches everything except the estate list itself.
    queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "estates" });
  }

  const renameMutation = useMutation({
    mutationFn: ({ id, farmName }: { id: number; farmName: string }) => renameEstate(id, farmName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["estates"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEstate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["estates"] });
    },
  });

  return { ...query, activeEstateId, switchEstate, renameEstate: renameMutation, deleteEstate: deleteMutation };
}
