import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Pencil,
  Trash2,
  Plus,
  FlaskConical,
  SprayCan,
  Droplets,
  Scissors,
  Wheat,
  Wrench,
  Check,
} from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { HeaderAddButton, IconChip } from "../../../components/harvest";
import { colors, radius, spacing, shadow } from "../../../components/theme";
import { useYearPlan } from "../hooks/useYearPlan";
import { ApiError, isGateError } from "../../../api/errors";
import type { PlanTask } from "../../../types/api";

const CAT_LABEL: Record<string, string> = {
  fertilizer: "Fertiliser",
  spray: "Spray",
  irrigation: "Irrigation",
  pruning: "Pruning / Weeding",
  harvest: "Harvest",
  other: "Other",
};

const CAT_ICON: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  fertilizer: FlaskConical,
  spray: SprayCan,
  irrigation: Droplets,
  pruning: Scissors,
  harvest: Wheat,
  other: Wrench,
};

const CAT_COLOR: Record<string, string> = {
  fertilizer: "#0F9D58",
  spray: "#1E88E5",
  irrigation: "#00ACC1",
  pruning: "#B7791F",
  harvest: "#7CB342",
  other: colors.textMuted,
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

function daysIn(month: string): number {
  const [y, mo] = month.split("-").map(Number);
  return new Date(y, mo, 0).getDate();
}

/**
 * Tappable month calendar: today is filled, days with scheduled work show a
 * dot (orange while pending, green once all done). Tapping a date filters
 * the lists below to that day; tapping again clears the filter.
 */
function MonthGrid({
  month,
  pendingDays,
  doneDays,
  selectedDay,
  onSelectDay,
}: {
  month: string;
  pendingDays: Set<number>;
  doneDays: Set<number>;
  selectedDay: number | null;
  onSelectDay: (d: number) => void;
}) {
  const [y, mo] = month.split("-").map(Number);
  const first = new Date(y, mo - 1, 1);
  const daysInMonth = daysIn(month);
  // Monday-first week, as farmers in India expect.
  const lead = (first.getDay() + 6) % 7;
  const today = new Date();
  const isThisMonth = today.getFullYear() === y && today.getMonth() === mo - 1;
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, i + 1).toLocaleDateString("en-IN", { weekday: "narrow" })
  );
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View>
      <View style={styles.weekRow}>
        {weekdays.map((w, i) => (
          <Text key={i} style={styles.weekdayText}>{w}</Text>
        ))}
      </View>
      <View style={styles.gridRow}>
        {cells.map((d, i) => {
          if (d == null) return <View key={i} style={styles.dayCell} />;
          const isToday = isThisMonth && d === today.getDate();
          const isSel = d === selectedDay;
          const hasPending = pendingDays.has(d);
          const hasDone = doneDays.has(d);
          return (
            <Pressable key={i} onPress={() => onSelectDay(d)} style={styles.dayCell}>
              <View
                style={[
                  styles.dayNumWrap,
                  isSel && styles.dayNumSelected,
                  isToday && !isSel && styles.dayNumToday,
                ]}
              >
                <Text style={[styles.dayNumText, (isToday || isSel) && styles.dayNumTextActive, isToday && !isSel && { color: colors.accentInk }]}>{d}</Text>
              </View>
              <View
                style={[
                  styles.dayDot,
                  hasPending ? { backgroundColor: "#F59E0B" } : hasDone ? { backgroundColor: "#22C55E" } : null,
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function YearPlanScreen({ navigation }: { navigation: any }) {
  const { tasks, crops, isLoading, generate, toggleDone, removeTask } = useYearPlan();
  const months = useMemo(next12Months, []);
  const thisMonth = months[0];
  const [selMonth, setSelMonth] = useState(thisMonth);
  const [selDay, setSelDay] = useState<number | null>(null);

  useEffect(() => setSelDay(null), [selMonth]);

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

  const selTasksAll = (byMonth.get(selMonth) ?? []).slice().sort((a, b) => (a.day ?? 99) - (b.day ?? 99));
  const dayFilter = (t: PlanTask) => selDay == null || t.day === selDay;
  const pending = selTasksAll.filter((t) => !t.done && dayFilter(t));
  const completed = selTasksAll.filter((t) => t.done && dayFilter(t));
  const overdue = useMemo(
    () => (selMonth === thisMonth && selDay == null ? tasks.filter((t) => !t.done && t.month < thisMonth) : []),
    [selMonth, thisMonth, tasks, selDay]
  );

  const pendingDays = useMemo(
    () => new Set(selTasksAll.filter((t) => !t.done && t.day != null).map((t) => t.day as number)),
    [selTasksAll]
  );
  const doneDays = useMemo(
    () => new Set(selTasksAll.filter((t) => t.done && t.day != null).map((t) => t.day as number)),
    [selTasksAll]
  );

  const hasTasks = tasks.length > 0;
  const hasCrops = crops.length > 0;

  function onGenerate() {
    generate.mutate(undefined, {
      onError: (err) => {
        if (isGateError(err)) {
          // The plan/wallet prompt already explained it, with a button to fix it.
        } else if (err instanceof ApiError && err.message.includes("no_crops")) {
          Alert.alert("Add a crop first", "Add at least one crop before generating a plan.");
        } else {
          Alert.alert("Couldn't generate plan", "Please try again.");
        }
      },
    });
  }

  function confirmDelete(task: PlanTask) {
    Alert.alert("Delete task?", task.title, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => removeTask.mutate(task.id) },
    ]);
  }

  function cropName(id: number | null) {
    return id != null ? crops.find((c) => c.id === id)?.name : undefined;
  }

  useEffect(() => {
    navigation.setOptions({ headerRight: () => <HeaderAddButton label="Add task" onPress={openAdd} /> });
  });

  function openAdd() {
    navigation.navigate("PlanTaskForm", { defaultMonth: selMonth, defaultDay: selDay });
  }

  function renderTask(task: PlanTask, monthTag?: string) {
    const Icon = CAT_ICON[task.category] ?? Wrench;
    const color = CAT_COLOR[task.category] ?? colors.textMuted;
    return (
      <View key={task.id} style={[styles.taskCard, task.done && { opacity: 0.55 }]}>
        <Pressable onPress={() => toggleDone.mutate(task)} hitSlop={8} style={styles.checkbox}>
          <View style={[styles.checkboxDot, task.done && { backgroundColor: colors.primary, borderColor: colors.primary }]} />
        </Pressable>
        <View style={{ flex: 1 }}>
          {monthTag ? <Text style={styles.overdueTag}>Overdue from {monthTag}</Text> : null}
          <Text style={[styles.taskTitle, task.done && { textDecorationLine: "line-through" }]}>
            {task.day != null ? `${task.day}. ` : ""}
            {task.title}
          </Text>
          {task.details ? <Text style={styles.taskDetails}>{task.details}</Text> : null}
          <View style={styles.taskMetaRow}>
            <View style={[styles.catChip, { backgroundColor: color + "1F" }]}>
              <Icon size={11} color={color} />
              <Text style={[styles.catChipText, { color }]}>{CAT_LABEL[task.category] ?? "Other"}</Text>
            </View>
            <Text style={styles.taskMeta}>{cropName(task.cropId) ?? "Whole farm"}</Text>
          </View>
        </View>
        <View style={styles.taskActions}>
          <Pressable onPress={() => navigation.navigate("PlanTaskForm", { task })} hitSlop={8}>
            <Pencil size={15} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => confirmDelete(task)} hitSlop={8}>
            <Trash2 size={15} color={colors.danger} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
      {/* Month chips, as on the canvas */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {shownMonths.map((m) => {
          const on = m === selMonth;
          return (
            <Pressable
              key={m}
              onPress={() => {
                setSelMonth(m);
                setSelDay(null);
              }}
              style={[styles.monthChip, on && styles.monthChipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              {on ? <Check size={16} color={colors.text} strokeWidth={2.6} /> : null}
              <Text style={styles.monthChipText}>{monthLabel(m).split(" ")[0]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IconChip icon={Sparkles} index={4} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>{hasTasks ? "Rebuild my plan with AI" : "Plan my year with AI"}</Text>
            <Text style={styles.aiSub}>Uses your crops, area and weather</Text>
          </View>
        </View>
        <Button
          title={generate.isPending ? "Generating..." : "Generate plan"}
          variant="light"
          icon={Sparkles}
          onPress={onGenerate}
          loading={generate.isPending}
          disabled={!hasCrops}
        />
        {!hasCrops ? (
          <Text style={styles.hint}>
            Add a crop first, then generate a plan.{" "}
            <Text style={styles.link} onPress={() => navigation.navigate("Crops")}>Go to Crops</Text>
          </Text>
        ) : hasTasks ? (
          <Text style={styles.hint}>Rebuilding replaces AI tasks not yet done — your own tasks are kept. Confirm doses with your local KVK.</Text>
        ) : null}
      </Card>

      {isLoading ? (
        <LoadingView label="Loading plan..." />
      ) : !hasTasks ? (
        <EmptyState title="No plan yet" subtitle="Generate an AI plan or add tasks manually." />
      ) : (
        <>
          <Card style={{ padding: 0, overflow: "hidden", marginBottom: spacing.md }}>
            <View style={styles.pagerRow}>
              <Pressable onPress={() => canPrev && setSelMonth(shownMonths[selIdx - 1])} disabled={!canPrev} hitSlop={10}>
                <ChevronLeft size={20} color={canPrev ? colors.primary : colors.border} />
              </Pressable>
              <View style={{ alignItems: "center" }}>
                <Text style={styles.pagerMonth}>{monthLabel(selMonth)}</Text>
                <Text style={styles.pagerSub}>Pending works: {pending.length + overdue.length}</Text>
              </View>
              <Pressable onPress={() => canNext && setSelMonth(shownMonths[selIdx + 1])} disabled={!canNext} hitSlop={10}>
                <ChevronRight size={20} color={canNext ? colors.primary : colors.border} />
              </Pressable>
            </View>
            <View style={{ padding: spacing.sm }}>
              <MonthGrid
                month={selMonth}
                pendingDays={pendingDays}
                doneDays={doneDays}
                selectedDay={selDay}
                onSelectDay={(d) => setSelDay((cur) => (cur === d ? null : d))}
              />
            </View>
          </Card>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>PENDING WORKS</Text>
            <Pressable onPress={openAdd} hitSlop={8} style={styles.addBtn} accessibilityLabel="Add task">
              <Plus size={20} color="#FFFFFF" strokeWidth={2.4} />
            </Pressable>
          </View>
          {pending.length === 0 && overdue.length === 0 ? (
            <Text style={styles.muted}>Nothing pending {selDay != null ? "this day" : "this month"}.</Text>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {overdue.map((t) => renderTask(t, monthLabel(t.month)))}
              {pending.map((t) => renderTask(t))}
            </View>
          )}

          {completed.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                COMPLETED ({completed.length})
              </Text>
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
  hint: { fontSize: 14, color: colors.textMuted, marginTop: spacing.sm },
  link: { color: colors.primary, fontWeight: "600" },

  monthChip: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  monthChipOn: { borderColor: colors.primary, backgroundColor: colors.tint },
  monthChipText: { fontSize: 16, fontWeight: "700", color: colors.text },
  aiTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  aiSub: { fontSize: 14, color: colors.textMuted },
  pagerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.xs,
    backgroundColor: colors.bg,
  },
  pagerMonth: { fontSize: 22, fontWeight: "800", color: colors.text },
  pagerSub: { fontSize: 14, color: colors.primary, fontWeight: "600", marginTop: 1 },

  weekRow: { flexDirection: "row" },
  weekdayText: { flex: 1, textAlign: "center", fontSize: 13, fontWeight: "600", color: colors.textMuted },
  gridRow: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: `${100 / 7}%`, alignItems: "center", paddingVertical: 4 },
  dayNumWrap: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dayNumToday: { backgroundColor: colors.accent },
  dayNumSelected: { backgroundColor: colors.primary },
  dayNumText: { fontSize: 14.5, color: colors.text },
  dayNumTextActive: { color: "#fff", fontWeight: "700" },
  dayDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2, backgroundColor: "transparent" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  sectionLabel: { fontSize: 20, fontWeight: "800", color: colors.text },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  muted: { color: colors.textMuted, fontSize: 14.5, paddingVertical: spacing.sm },

  taskCard: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 22,
    ...shadow,
    padding: spacing.md,
    alignItems: "flex-start",
  },
  checkbox: { paddingTop: 2 },
  checkboxDot: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: colors.primary,
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
  taskTitle: { fontSize: 16.5, fontWeight: "700", color: colors.text },
  taskDetails: { fontSize: 14.5, color: colors.textMuted, marginTop: 2 },
  taskMetaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs, flexWrap: "wrap" },
  catChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  catChipText: { fontSize: 13, fontWeight: "700" },
  taskMeta: { fontSize: 14, color: colors.textMuted },
  taskActions: { gap: spacing.sm, alignItems: "center", paddingTop: 2 },
});
