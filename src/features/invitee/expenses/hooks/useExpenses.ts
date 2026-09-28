import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createExpense, getExpenses } from "../../api";
import { getCrops } from "../../api";
import { useEstateStore } from "../../../estate/store/estateStore";
import type { CreateExpenseRequest } from "../../types";

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
    mutationFn: (data: CreateExpenseRequest) => createExpense(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses", activeEstateId] }),
  });

  return { ...query, crops: cropsQuery.data ?? [], createExpense: createMutation };
}
