import React, { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { getAllAttendance } from "../../../api/endpoints/attendance";
import { useEstateStore } from "../../estate/store/estateStore";
import type { AttendanceRecord } from "../../../types/api";

interface WorkerSummary {
  workerId: number;
  workerName: string;
  daysWorked: number;
  totalHours: number;
  records: AttendanceRecord[];
}

/** Money-free view: how many days/hours each worker has logged, ever. */
export function EmployeeAttendanceScreen() {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.subtitle}>Attendance totals to date — no payment figures here.</Text>
      {summaries.length === 0 ? (
        <EmptyState title="No attendance yet" subtitle="Mark attendance from a work group to see totals here." />
      ) : (
        summaries.map((s) => {
          const expanded = expandedId === s.workerId;
          const roster = s.records.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
          return (
            <Card key={s.workerId}>
              <Pressable
                style={styles.row}
                onPress={() => setExpandedId(expanded ? null : s.workerId)}
              >
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
                      <Text style={styles.rosterDate}>{r.date}</Text>
                      <Text style={styles.rosterMeta}>
                        {r.workGroupName ?? "—"} · {Number(r.hoursWorked ?? 0).toFixed(1)}h
                      </Text>
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
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs },
  row: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  roster: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, gap: 6 },
  rosterRow: { flexDirection: "row", justifyContent: "space-between" },
  rosterDate: { fontSize: 12.5, color: colors.text },
  rosterMeta: { fontSize: 12.5, color: colors.textMuted },
});
