import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createLoan, createLoanPayment, deleteLoan, getLoans } from "../../../api/endpoints/loans";
import { getWorkers } from "../../../api/endpoints/attendance";
import { useEstateStore } from "../../estate/store/estateStore";
import type { CreateLoanPaymentRequest, CreateLoanRequest } from "../../../types/api";

export function useLoans() {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["loans", activeEstateId],
    queryFn: getLoans,
    enabled: activeEstateId != null,
  });

  const workersQuery = useQuery({
    queryKey: ["workers", activeEstateId],
    queryFn: getWorkers,
    enabled: activeEstateId != null,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["loans", activeEstateId] });
  }

  const createMutation = useMutation({
    mutationFn: (data: CreateLoanRequest) => createLoan(data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteLoan(id),
    onSuccess: invalidate,
  });

  const payMutation = useMutation({
    mutationFn: ({ loanId, data }: { loanId: number; data: CreateLoanPaymentRequest }) =>
      createLoanPayment(loanId, data),
    onSuccess: invalidate,
  });

  return {
    ...query,
    workers: workersQuery.data ?? [],
    createLoan: createMutation,
    deleteLoan: deleteMutation,
    payLoan: payMutation,
  };
}
