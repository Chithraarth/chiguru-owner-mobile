import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { createExpense, deleteExpense, getExpenses } from "../../../api/endpoints/expenses";
import { getCrops } from "../../../api/endpoints/crops";
import { useEstateStore } from "../../estate/store/estateStore";
import type { CreateExpenseRequest } from "../../../types/api";

export function useExpenses() {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["expenses", activeEstateId],
    queryFn: getExpenses,
    enabled: activeEstateId != null,
  });

  const cropsQuery = useQuery({
    queryKey: ["crops", activeEstateId],
    queryFn: getCrops,
    enabled: activeEstateId != null,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateExpenseRequest) => {
      // Expenses are not idempotent server-side (no clientId support) - a
      // queued/retried write could double-charge, so this is explicitly
      // blocked offline rather than silently queued, mirroring the web app.
      const net = await NetInfo.fetch();
      if (net.isConnected === false) {
        throw new Error("No internet — expenses can't be saved offline. Try again once connected.");
      }
      return createExpense(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses", activeEstateId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteExpense(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses", activeEstateId] }),
  });

  return {
    ...query,
    crops: cropsQuery.data ?? [],
    createExpense: createMutation,
    deleteExpense: deleteMutation,
  };
}
