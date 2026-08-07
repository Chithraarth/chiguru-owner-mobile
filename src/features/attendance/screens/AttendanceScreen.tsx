import React, { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { colors, spacing } from "../../../components/theme";
import { useAttendance } from "../hooks/useAttendance";
import { useWorkGroups } from "../../work-groups/hooks/useWorkGroups";
import { describeDevice } from "../../../lib/device";
import { useSyncStore } from "../../../store/syncStore";

export function AttendanceScreen({ route }: { route: any }) {
  const { workGroupId } = route.params as {
    workGroupId: number;
    workGroupName: string;
  };
  const { workers, attendance, isLoading, refetch, markAttendance, date } =
    useAttendance(workGroupId);
  const { data: workGroups } = useWorkGroups();
  const workGroup = workGroups?.find((g) => g.id === workGroupId);
  const rate = Number(workGroup?.rate ?? 0);
  const paymentType = workGroup?.paymentType ?? "Per day";
  const isHarvestGroup = paymentType === "Per kg";
  // Default OT rate: hourly-equivalent of the group's rate, matching the
  // backend's own fallback so the preview and the settled amount agree.
  const defaultOtRate = paymentType === "Per hour" ? rate : rate / 8;

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [otHours, setOtHours] = useState<Record<number, string>>({});
  const [otRate, setOtRate] = useState<Record<number, string>>({});
  const [harvestKg, setHarvestKg] = useState<Record<number, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const isOnline = useSyncStore((s) => s.isOnline);
  const insets = useSafeAreaInsets();

  const markedIds = useMemo(
    () => new Set(attendance.filter((a) => a.workGroupId === workGroupId).map((a) => a.workerId)),
    [attendance, workGroupId]
  );

  const eligibleWorkers = workers.filter((w) => w.isActive);

  function toggle(workerId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(workerId)) next.delete(workerId);
      else next.add(workerId);
      return next;
    });
  }

  function extraFor(workerId: number): number {
    const ot = Number(otHours[workerId] ?? 0) * Number(otRate[workerId] ?? defaultOtRate);
    const kg = isHarvestGroup ? Number(harvestKg[workerId] ?? 0) * rate : 0;
    return (Number.isFinite(ot) ? ot : 0) + (Number.isFinite(kg) ? kg : 0);
  }

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function save() {
    const deviceLabel = describeDevice();
    for (const workerId of selected) {
      const hoursWorked = paymentType === "Per hour" ? 8 : undefined;
      const baseWage = isHarvestGroup ? Number(harvestKg[workerId] ?? 0) * rate : paymentType === "Per hour" ? rate * 8 : rate;
      const otH = Number(otHours[workerId] ?? 0);
      const otR = Number(otRate[workerId] ?? defaultOtRate);
      const otAmount = otH > 0 ? otH * otR : 0;
      await markAttendance.mutateAsync({
        workGroupId,
        workerId,
        date,
        hoursWorked,
        wageAmount: baseWage + otAmount,
        overtimeHours: otH > 0 ? otH : undefined,
        overtimeRate: otH > 0 ? otR : undefined,
        harvestedKg: isHarvestGroup && harvestKg[workerId] ? Number(harvestKg[workerId]) : undefined,
        deviceLabel,
      });
    }
    setSelected(new Set());
    setOtHours({});
    setOtRate({});
    setHarvestKg({});
    setExpandedId(null);
  }

  if (isLoading) return <LoadingView label="Loading attendance..." />;

  const totalDue = [...selected].reduce((sum, id) => {
    const base = isHarvestGroup ? Number(harvestKg[id] ?? 0) * rate : paymentType === "Per hour" ? rate * 8 : rate;
    return sum + base + extraFor(id);
  }, 0);

  return (
    <View style={styles.container}>
      {!isOnline ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline — attendance will sync when you're back online</Text>
        </View>
      ) : null}
      <FlatList
        data={eligibleWorkers}
        keyExtractor={(w) => String(w.id)}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState title="No workers yet" subtitle="Add workers before marking attendance." />
        }
        renderItem={({ item }) => {
          const marked = markedIds.has(item.id);
          const isSelected = selected.has(item.id);
          const expanded = expandedId === item.id;
          return (
            <Card style={[styles.workerRow, isSelected && styles.workerRowSelected, marked && styles.workerRowMarked]}>
              <Pressable disabled={marked} onPress={() => toggle(item.id)} style={styles.workerRowMain}>
                <Text style={styles.workerName}>{item.name}</Text>
                {marked ? (
                  <Text style={styles.markedLabel}>Marked present ✓</Text>
                ) : (
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]} />
                )}
              </Pressable>
              {isSelected && !marked ? (
                <>
                  <Pressable style={styles.extraToggle} onPress={() => setExpandedId(expanded ? null : item.id)}>
                    <Text style={styles.extraToggleText}>
                      {isHarvestGroup ? "Kg picked" : "+ Overtime"}
                      {extraFor(item.id) > 0 ? ` (+₹${extraFor(item.id).toFixed(0)})` : ""}
                    </Text>
                    {expanded ? <ChevronUp size={14} color={colors.primary} /> : <ChevronDown size={14} color={colors.primary} />}
                  </Pressable>
                  {expanded ? (
                    <View style={styles.extraFields}>
                      {isHarvestGroup ? (
                        <TextField
                          label="Kg picked"
                          keyboardType="decimal-pad"
                          value={harvestKg[item.id] ?? ""}
                          onChangeText={(v) => setHarvestKg((cur) => ({ ...cur, [item.id]: v }))}
                          containerStyle={{ marginBottom: 0 }}
                        />
                      ) : (
                        <View style={{ flexDirection: "row", gap: spacing.sm }}>
                          <View style={{ flex: 1 }}>
                            <TextField
                              label="OT hours"
                              keyboardType="decimal-pad"
                              value={otHours[item.id] ?? ""}
                              onChangeText={(v) => setOtHours((cur) => ({ ...cur, [item.id]: v }))}
                              containerStyle={{ marginBottom: 0 }}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <TextField
                              label="OT rate/hr"
                              keyboardType="decimal-pad"
                              placeholder={defaultOtRate.toFixed(0)}
                              value={otRate[item.id] ?? ""}
                              onChangeText={(v) => setOtRate((cur) => ({ ...cur, [item.id]: v }))}
                              containerStyle={{ marginBottom: 0 }}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  ) : null}
                </>
              ) : null}
            </Card>
          );
        }}
      />
      {selected.size > 0 ? (
        <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
          <Button
            title={`Mark ${selected.size} present · ₹${totalDue.toFixed(0)}`}
            onPress={save}
            loading={markAttendance.isPending}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  offlineBanner: { backgroundColor: colors.amberBg, padding: spacing.sm },
  offlineText: { color: colors.warning, textAlign: "center", fontSize: 12 },
  workerRow: {},
  workerRowMain: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  workerRowSelected: { borderColor: colors.primary, borderWidth: 2 },
  workerRowMarked: { opacity: 0.6 },
  workerName: { fontSize: 15, color: colors.text, fontWeight: "500" },
  markedLabel: { fontSize: 12, color: colors.primary },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
  },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  extraToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  extraToggleText: { fontSize: 12.5, color: colors.primary, fontWeight: "600" },
  extraFields: { marginTop: spacing.sm },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
