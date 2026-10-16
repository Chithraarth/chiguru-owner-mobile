import React, { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { Avatar, StatTiles } from "../../../components/harvest";
import { colors, radius, spacing } from "../../../components/theme";
import { getAllAttendance, getWorkers } from "../../../api/endpoints/attendance";
import { DateBar, fmtDay } from "../../../components/DateBar";
import { useEstateStore } from "../../estate/store/estateStore";
import type { AttendanceRecord } from "../../../types/api";

interface WorkerSummary {
  workerId: number;
  workerName: string;
  daysWorked: number;
  totalHours: number;
  records: AttendanceRecord[];
}

/** "Soybean harvesting · 8h + 2h OT" */
function dayLine(r: AttendanceRecord) {
  const h = Number(r.hoursWorked ?? 0);
  const ot = Number(r.overtimeHours ?? 0);
  return `${r.workGroupName ?? "—"} · ${h % 1 ? h.toFixed(1) : h}h${ot > 0 ? ` + ${ot}h OT` : ""}`;
}

/** Money-free view: how many days/hours each worker has logged, ever. */
export function EmployeeAttendanceScreen() {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<"worker" | "date">("worker");
  const [day, setDay] = useState<string | null>(null);
  const workersQuery = useQuery({
    queryKey: ["workers", activeEstateId],
    queryFn: getWorkers,
    enabled: activeEstateId != null,
  });

  const query = useQuery({
    queryKey: ["all-attendance", activeEstateId],
    queryFn: getAllAttendance,
    enabled: activeEstateId != null,
  });

  const summaries = useMemo<WorkerSummary[]>(() => {
    const byWorker = new Map<number, WorkerSummary>();
    for (const r of query.data ?? []) {
      const existing = byWorker.get(r.workerId);
      const hours = Number(r.hoursWorked ?? 0);
      if (existing) {
        existing.daysWorked += 1;
        existing.totalHours += hours;
        existing.records.push(r);
      } else {
        byWorker.set(r.workerId, {
          workerId: r.workerId,
          workerName: r.workerName ?? "Unknown",
          daysWorked: 1,
          totalHours: hours,
          records: [r],
        });
      }
    }
    return [...byWorker.values()].sort((a, b) => b.daysWorked - a.daysWorked);
  }, [query.data]);

  async function onRefresh() {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }

  if (query.isLoading) return <LoadingView label="Loading attendance..." />;

  const allDates = [...new Set((query.data ?? []).map((r) => r.date))].sort();
  const shownDay = day ?? allDates[allDates.length - 1] ?? null;
  const dayRecords = (query.data ?? []).filter((r) => r.date === shownDay);
  const presentIds = new Set(dayRecords.map((r) => r.workerId));
  const absent = (workersQuery.data ?? []).filter((w) => w.isActive && !presentIds.has(w.id));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <StatTiles
        items={[
          { label: "Workers", value: String(summaries.length), sub: "on record" },
          { label: "Days", value: String(summaries.reduce((n, x) => n + x.daysWorked, 0)), sub: "worked" },
          { label: "Hours", value: String(Math.round(summaries.reduce((n, x) => n + x.totalHours, 0))), sub: "total" },
        ]}
      />
      <Text style={styles.subtitle}>Attendance totals to date — no payment figures here.</Text>
      <View style={styles.toggle}>
        {([["worker", "By worker"], ["date", "By date"]] as const).map(([k, label]) => (
          <Pressable
            key={k}
            onPress={() => setMode(k)}
            style={[styles.toggleBtn, mode === k && styles.toggleBtnOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === k }}
          >
            <Text style={[styles.toggleText, mode === k && styles.toggleTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {mode === "date" ? (
        shownDay ? (
          <>
            <DateBar dates={allDates} value={shownDay} onChange={(d) => setDay(d)} allowAll={false} />
            <Card style={{ gap: 6 }}>
              <Text style={styles.dayHeading}>
                Present · {dayRecords.length}
              </Text>
              {dayRecords.length === 0 ? (
                <Text style={styles.meta}>No one was recorded on {fmtDay(shownDay)}.</Text>
              ) : (
                dayRecords.map((r) => (
                  <View key={r.id} style={styles.rosterRow}>
                    <Text style={styles.rosterDate}>{r.workerName ?? "—"}</Text>
                    <Text style={styles.rosterMeta}>{dayLine(r)}</Text>
                  </View>
                ))
              )}
            </Card>
            {absent.length > 0 ? (
              <Card style={{ gap: 6 }}>
                <Text style={[styles.dayHeading, { color: colors.textMuted }]}>Absent · {absent.length}</Text>
                {absent.map((w) => (
                  <Text key={w.id} style={styles.absentName}>{w.name}</Text>
                ))}
              </Card>
            ) : null}
          </>
        ) : (
          <EmptyState title="No attendance yet" subtitle="Mark attendance from a work group to see it here." />
        )
      ) : summaries.length === 0 ? (
        <EmptyState title="No attendance yet" subtitle="Mark attendance from a work group to see totals here." />
      ) : (
        summaries.map((s, i) => {
          const expanded = expandedId === s.workerId;
          const roster = s.records.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
          return (
            <Card key={s.workerId} style={{ gap: 4 }}>
              <Pressable
                style={styles.row}
                onPress={() => setExpandedId(expanded ? null : s.workerId)}
              >
                <Avatar name={s.workerName} index={i} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{s.workerName}</Text>
                  <Text style={styles.meta}>
                    {s.daysWorked} day{s.daysWorked === 1 ? "" : "s"} worked · {s.totalHours.toFixed(1)} hrs total
                  </Text>
                </View>
                {expanded ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronDown size={18} color={colors.textMuted} />}
              </Pressable>
              {expanded ? (
                <View style={styles.roster}>
                  {roster.map((r) => (
                    <View key={r.id} style={styles.rosterRow}>
                      <Text style={styles.rosterDate}>{fmtDay(r.date)}</Text>
                      <Text style={styles.rosterMeta}>{dayLine(r)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  subtitle: { fontSize: 14.5, color: colors.textMuted, marginBottom: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 16.5, fontWeight: "700", color: colors.text },
  meta: { fontSize: 14.5, color: colors.textMuted, marginTop: 2 },
  roster: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, gap: 6 },
  rosterRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  toggle: { flexDirection: "row", backgroundColor: colors.muted, borderRadius: radius.pill, padding: 4, gap: 4 },
  toggleBtn: { flex: 1, minHeight: 42, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  toggleBtnOn: { backgroundColor: colors.card },
  toggleText: { fontSize: 14.5, fontWeight: "600", color: colors.textMuted },
  toggleTextOn: { color: colors.text, fontWeight: "800" },
  dayHeading: { fontSize: 15, fontWeight: "800", color: colors.primary, marginBottom: 2 },
  absentName: { fontSize: 14.5, color: colors.textMuted },
  rosterDate: { fontSize: 14.5, color: colors.text },
  rosterMeta: { fontSize: 14.5, color: colors.textMuted },
});
