import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../../components/Text";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Card } from "../../../../components/Card";
import { EmptyState, LoadingView } from "../../../../components/StateViews";
import { colors, radius, spacing } from "../../../../components/theme";
import { getPlanTasks } from "../../api";
import { useEstateStore } from "../../../estate/store/estateStore";
import type { PlanTask } from "../../types";

const CAT_LABEL: Record<string, string> = {
  fertilizer: "Fertilizer",
  spray: "Spray",
  irrigation: "Irrigation",
  pruning: "Pruning",
  harvest: "Harvest",
  other: "Other",
};

function next12Months(): string[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}
function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** Read-only: only the owner adds/edits Year Plan tasks. The manager just needs to see what's due. */
export function WorkPlanScreen() {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const months = useMemo(next12Months, []);
  const thisMonth = months[0];
  const [selMonth, setSelMonth] = useState(thisMonth);

  const query = useQuery({
    queryKey: ["plan-tasks", activeEstateId],
    queryFn: getPlanTasks,
    enabled: activeEstateId != null,
  });
  const tasks = query.data ?? [];

  const byMonth = useMemo(() => {
    const map = new Map<string, PlanTask[]>();
    for (const t of tasks) {
      const list = map.get(t.month) ?? [];
      list.push(t);
      map.set(t.month, list);
    }
    return map;
  }, [tasks]);

  const shownMonths = useMemo(() => {
    const extra = [...byMonth.keys()].filter((m) => !months.includes(m));
    return [...extra.filter((m) => m < thisMonth), ...months, ...extra.filter((m) => m > months[11])].sort();
  }, [byMonth, months, thisMonth]);

  const selIdx = shownMonths.indexOf(selMonth);
  const canPrev = selIdx > 0;
  const canNext = selIdx >= 0 && selIdx < shownMonths.length - 1;

  const selTasks = (byMonth.get(selMonth) ?? []).slice().sort((a, b) => (a.day ?? 99) - (b.day ?? 99));
  const pending = selTasks.filter((t) => !t.done);
  const completed = selTasks.filter((t) => t.done);
  const overdue = useMemo(
    () => (selMonth === thisMonth ? tasks.filter((t) => !t.done && t.month < thisMonth) : []),
    [selMonth, thisMonth, tasks]
  );

  if (query.isLoading) return <LoadingView label="Loading plan..." />;

  function renderTask(task: PlanTask, monthTag?: string) {
    return (
      <View key={task.id} style={[styles.taskCard, task.done && { opacity: 0.55 }]}>
        {monthTag ? <Text style={styles.overdueTag}>Overdue from {monthTag}</Text> : null}
        <Text style={[styles.taskTitle, task.done && { textDecorationLine: "line-through" }]}>
          {task.day != null ? `${task.day}. ` : ""}
          {task.title}
        </Text>
        {task.details ? <Text style={styles.taskDetails}>{task.details}</Text> : null}
        <Text style={styles.taskMeta}>{CAT_LABEL[task.category] ?? "Other"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={styles.subtitle}>The owner's schedule for this farm — for your reference.</Text>

      {tasks.length === 0 ? (
        <EmptyState title="No plan yet" subtitle="The owner hasn't added a Year Plan for this farm." />
      ) : (
        <>
          <Card style={styles.pagerCard}>
            <Pressable onPress={() => canPrev && setSelMonth(shownMonths[selIdx - 1])} disabled={!canPrev} hitSlop={10}>
              <ChevronLeft size={22} color={canPrev ? colors.primary : colors.border} />
            </Pressable>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.pagerMonth}>{monthLabel(selMonth)}</Text>
              <Text style={styles.pagerSub}>
                {pending.length + overdue.length > 0
                  ? `${pending.length + overdue.length} pending`
                  : completed.length > 0
                    ? `${completed.length} completed`
                    : "Nothing scheduled"}
              </Text>
            </View>
            <Pressable onPress={() => canNext && setSelMonth(shownMonths[selIdx + 1])} disabled={!canNext} hitSlop={10}>
              <ChevronRight size={22} color={canNext ? colors.primary : colors.border} />
            </Pressable>
          </Card>

          <Text style={styles.sectionLabel}>PENDING</Text>
          {pending.length === 0 && overdue.length === 0 ? (
            <Text style={styles.muted}>Nothing pending this month.</Text>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {overdue.map((t) => renderTask(t, monthLabel(t.month)))}
              {pending.map((t) => renderTask(t))}
            </View>
          )}

          {completed.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>COMPLETED ({completed.length})</Text>
              <View style={{ gap: spacing.sm }}>{completed.map((t) => renderTask(t))}</View>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  subtitle: { fontSize: 14.5, color: colors.textMuted, marginBottom: spacing.md },
  pagerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  pagerMonth: { fontSize: 18, fontWeight: "700", color: colors.text },
  pagerSub: { fontSize: 14, color: colors.primary, fontWeight: "600", marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: colors.primary, letterSpacing: 0.6, marginBottom: spacing.sm },
  muted: { color: colors.textMuted, fontSize: 14.5, paddingVertical: spacing.sm },
  taskCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  overdueTag: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B7791F",
    backgroundColor: "#FEF3C7",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginBottom: 4,
  },
  taskTitle: { fontSize: 16.5, fontWeight: "600", color: colors.text },
  taskDetails: { fontSize: 14.5, color: colors.textMuted, marginTop: 2 },
  taskMeta: { fontSize: 13.5, color: colors.textMuted, marginTop: spacing.xs, textTransform: "uppercase", letterSpacing: 0.3 },
});
