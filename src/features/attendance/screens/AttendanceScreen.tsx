import React, { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronDown, ChevronUp, Clock3, Wheat } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { ChipSelect } from "../../../components/ChipSelect";
import { TextField } from "../../../components/TextField";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { colors, spacing } from "../../../components/theme";
import { useAttendance } from "../hooks/useAttendance";
import { useWorkGroups } from "../../work-groups/hooks/useWorkGroups";
import { describeDevice } from "../../../lib/device";
import { useSyncStore } from "../../../store/syncStore";

const SETTLEMENT_MODES: { value: string; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "final", label: "Final account" },
];

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function AttendanceScreen({ route }: { route: any }) {
  const { workGroupId } = route.params as {
    workGroupId: number;
    workGroupName: string;
  };
  const {
    workers,
    attendance,
    isLoading,
    refetch,
    markAttendance,
    date,
    overtimeSummary,
    harvestBonusSummary,
    settleOvertime,
    settleHarvestBonus,
    updateWorkGroup,
  } = useAttendance(workGroupId);
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
  // Picking-bonus rule editor (threshold kg + pay/kg above it). Prefilled
  // from the group's saved rule, editable inline like the web app.
  const [pickThreshold, setPickThreshold] = useState(
    workGroup?.harvestThresholdKg != null ? String(Number(workGroup.harvestThresholdKg)) : ""
  );
  const [pickBonus, setPickBonus] = useState(
    workGroup?.harvestBonusPerKg != null ? String(Number(workGroup.harvestBonusPerKg)) : ""
  );
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
    // Picking-bonus rule (target kg + pay/kg above it) is owned by the work
    // group, not the attendance row - save it once here if it changed, same
    // as the web app does right before writing today's attendance.
    if (isHarvestGroup) {
      const threshold = Math.max(0, Number(pickThreshold) || 0);
      const bonusPerKg = Math.max(0, Number(pickBonus) || 0);
      const savedThreshold = Number(workGroup?.harvestThresholdKg ?? 0);
      const savedBonus = Number(workGroup?.harvestBonusPerKg ?? 0);
      if (threshold !== savedThreshold || bonusPerKg !== savedBonus) {
        await updateWorkGroup.mutateAsync({
          harvestThresholdKg: threshold > 0 ? String(threshold) : null,
          harvestBonusPerKg: bonusPerKg > 0 ? String(bonusPerKg) : null,
        });
      }
    }
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
        ListHeaderComponent={
          <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            {isHarvestGroup ? (
              <Card>
                <Text style={styles.ruleTitle}>Picking bonus rule</Text>
                <Text style={styles.ruleSubtitle}>
                  Pay extra for every kg picked above the daily target - applies to this whole group.
                </Text>
                <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Target/person (kg)"
                      keyboardType="decimal-pad"
                      placeholder="e.g. 80"
                      value={pickThreshold}
                      onChangeText={setPickThreshold}
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Bonus/kg above (₹)"
                      keyboardType="decimal-pad"
                      placeholder="e.g. 5"
                      value={pickBonus}
                      onChangeText={setPickBonus}
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                </View>
              </Card>
            ) : null}

            {!isHarvestGroup && overtimeSummary && overtimeSummary.pendingAmount + overtimeSummary.clearedAmount > 0 ? (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <View style={styles.settleHeader}>
                  <Clock3 size={14} color="#fff" />
                  <Text style={styles.settleHeaderText}>Overtime settlement</Text>
                </View>
                <View style={{ padding: spacing.md, gap: spacing.sm }}>
                  {overtimeSummary.pendingAmount > 0 ? (
                    <Text style={styles.settleLine}>
                      <Text style={{ fontWeight: "700" }}>{inr(overtimeSummary.pendingAmount)}</Text> pending for{" "}
                      {overtimeSummary.pendingHours.toFixed(1)} overtime hr{overtimeSummary.pendingHours !== 1 ? "s" : ""}
                    </Text>
                  ) : null}
                  {overtimeSummary.clearedAmount > 0 ? (
                    <Text style={styles.settleLineMuted}>{inr(overtimeSummary.clearedAmount)} already paid out</Text>
                  ) : null}
                  <ChipSelect
                    label="Settle overtime"
                    options={SETTLEMENT_MODES.map((m) => m.label)}
                    value={SETTLEMENT_MODES.find((m) => m.value === overtimeSummary.overtimeSettlement)?.label ?? "Weekly"}
                    onChange={(label) => {
                      const mode = SETTLEMENT_MODES.find((m) => m.label === label)?.value ?? "weekly";
                      updateWorkGroup.mutate({ overtimeSettlement: mode });
                    }}
                  />
                  {overtimeSummary.pendingAmount > 0 ? (
                    <Button
                      title={`Mark ${inr(overtimeSummary.pendingAmount)} overtime as paid`}
                      variant="secondary"
                      onPress={() => settleOvertime.mutate()}
                      loading={settleOvertime.isPending}
                    />
                  ) : null}
                </View>
              </Card>
            ) : null}

            {isHarvestGroup && harvestBonusSummary && harvestBonusSummary.pendingAmount + harvestBonusSummary.clearedAmount > 0 ? (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <View style={[styles.settleHeader, { backgroundColor: "#7CB342" }]}>
                  <Wheat size={14} color="#fff" />
                  <Text style={styles.settleHeaderText}>Picking bonus settlement</Text>
                </View>
                <View style={{ padding: spacing.md, gap: spacing.sm }}>
                  {harvestBonusSummary.pendingAmount > 0 ? (
                    <Text style={styles.settleLine}>
                      <Text style={{ fontWeight: "700" }}>{inr(harvestBonusSummary.pendingAmount)}</Text> pending for{" "}
                      {harvestBonusSummary.pendingKg.toFixed(0)} kg picked
                    </Text>
                  ) : null}
                  {harvestBonusSummary.clearedAmount > 0 ? (
                    <Text style={styles.settleLineMuted}>{inr(harvestBonusSummary.clearedAmount)} already paid out</Text>
                  ) : null}
                  <ChipSelect
                    label="Settle picking bonus"
                    options={SETTLEMENT_MODES.map((m) => m.label)}
                    value={SETTLEMENT_MODES.find((m) => m.value === harvestBonusSummary.harvestBonusSettlement)?.label ?? "Weekly"}
                    onChange={(label) => {
                      const mode = SETTLEMENT_MODES.find((m) => m.label === label)?.value ?? "weekly";
                      updateWorkGroup.mutate({ harvestBonusSettlement: mode });
                    }}
                  />
                  {harvestBonusSummary.pendingAmount > 0 ? (
                    <Button
                      title={`Mark ${inr(harvestBonusSummary.pendingAmount)} bonus as paid`}
                      variant="secondary"
                      onPress={() => settleHarvestBonus.mutate()}
                      loading={settleHarvestBonus.isPending}
                    />
                  ) : null}
                </View>
              </Card>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="No workers yet" subtitle="Add workers before marking attendance." />
        }
        renderItem={({ item }) => {
          const marked = markedIds.has(item.id);
          const isSelected = selected.has(item.id);
          const expanded = expandedId === item.id;
          return (
            <Card style={[styles.workerRow, isSelected && styles.workerRowSelected, marked && !isSelected && styles.workerRowMarked]}>
              <Pressable onPress={() => toggle(item.id)} style={styles.workerRowMain}>
                <Text style={styles.workerName}>{item.name}</Text>
                {marked ? (
                  <Text style={styles.markedLabel}>
                    {isSelected ? "Editing entry…" : "Marked present ✓ · tap to edit"}
                  </Text>
                ) : (
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]} />
                )}
              </Pressable>
              {isSelected ? (
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
  ruleTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  ruleSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  settleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  settleHeaderText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  settleLine: { fontSize: 13, color: colors.text },
  settleLineMuted: { fontSize: 12, color: colors.textMuted },
});
