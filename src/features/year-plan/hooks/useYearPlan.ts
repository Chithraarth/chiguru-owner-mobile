import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPlanTask,
  deletePlanTask,
  generatePlanTasks,
  getPlanTasks,
  updatePlanTask,
} from "../../../api/endpoints/yearPlan";
import { getCrops } from "../../../api/endpoints/crops";
import { useEstateStore } from "../../estate/store/estateStore";
import type { CreatePlanTaskRequest, PlanTask } from "../../../types/api";

export function useYearPlan() {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["plan-tasks", activeEstateId],
    queryFn: getPlanTasks,
    enabled: activeEstateId != null,
  });

  const cropsQuery = useQuery({
    queryKey: ["crops", activeEstateId],
    queryFn: getCrops,
    enabled: activeEstateId != null,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["plan-tasks", activeEstateId] });

  const generate = useMutation({
    mutationFn: generatePlanTasks,
    onSuccess: invalidate,
  });

  const toggleDone = useMutation({
    mutationFn: (task: PlanTask) => updatePlanTask(task.id, { done: !task.done }),
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ["plan-tasks", activeEstateId] });
      queryClient.setQueryData<PlanTask[]>(["plan-tasks", activeEstateId], (old = []) =>
        old.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x))
      );
    },
    onSettled: invalidate,
  });

  const saveTask = useMutation({
    mutationFn: (data: { id: number | null } & CreatePlanTaskRequest) => {
      const { id, ...body } = data;
      return id != null ? updatePlanTask(id, body) : createPlanTask(body);
    },
    onSuccess: invalidate,
  });

  const removeTask = useMutation({
    mutationFn: (id: number) => deletePlanTask(id),
    onSuccess: invalidate,
  });

  return {
    ...query,
    tasks: query.data ?? [],
    crops: cropsQuery.data ?? [],
    generate,
    toggleDone,
    saveTask,
    removeTask,
  };
}
