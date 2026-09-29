import React, { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "../../../../components/Text";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { ChevronDown, ChevronUp, Minus, Plus, Camera } from "lucide-react-native";
import { Card } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { TextField } from "../../../../components/TextField";
import { EmptyState, LoadingView } from "../../../../components/StateViews";
import { colors, spacing } from "../../../../components/theme";
import { useAttendance, useAdvancePayments, useWorkGroups } from "../hooks/useAttendance";
import { getAttendanceByGroup } from "../../api";
import { countWorkersFromPhoto } from "../../api";
import { compressToDataUrl } from "../../../../lib/imageCompression";
import { describeDevice } from "../../../../lib/device";
import { fmtMoney } from "../../currency";
import { useSyncStore } from "../../../../store/syncStore";
import { useInviteeMe } from "../../hooks/useInviteeMe";

export function AttendanceWorkersScreen({ route }: { route: any }) {
  const { workGroupId } = route.params as { workGroupId: number; workGroupName: string };
  const { workers, attendance, isLoading, refetch, markAttendance, date } = useAttendance();
  const { data: workGroups } = useWorkGroups();
  const workGroup = workGroups?.find((g) => g.id === workGroupId);
  const rate = Number(workGroup?.rate ?? 0);
  const paymentType = workGroup?.paymentType ?? "Per day";
  const isHarvestGroup = paymentType === "Per kg";
  const defaultOtRate = paymentType === "Per hour" ? rate : rate / 8;
  const managerMe = useInviteeMe();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [hours, setHours] = useState<Record<number, number>>({});
  const [otHours, setOtHours] = useState<Record<number, string>>({});
  const [otRate, setOtRate] = useState<Record<number, string>>({});
  const [harvestKg, setHarvestKg] = useState<Record<number, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const isOnline = useSyncStore((s) => s.isOnline);

  const advancesQuery = useAdvancePayments(workGroupId);
  const groupAttendanceQuery = useQuery({
    queryKey: ["attendance-by-group", workGroupId],
    queryFn: () => getAttendanceByGroup(workGroupId),
  });
  const workerDays = groupAttendanceQuery.data?.length ?? 0;
  const advancePerUnit = Number(workGroup?.advancePerUnit ?? 0);
  const advancesPaid = (advancesQuery.data ?? []).reduce((s, a) => s + Number(a.totalAdvancePaid), 0);
  const heldSoFar = workerDays * (rate - advancePerUnit) > 0 ? workerDays * (rate - advancePerUnit) : 0;

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

  function baseFor(workerId: number): number {
    if (isHarvestGroup) return Number(harvestKg[workerId] ?? 0) * rate;
    if (paymentType === "Per hour") return rate * (hours[workerId] ?? 8);
    return rate;
  }

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  // Take one photo of the work gang, AI-count them, and auto-select that many
  // unmarked workers so the manager doesn't have to tap each one by one.
  async function scanGroupPhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;

    setScanning(true);
    try {
      const dataUrl = await compressToDataUrl(result.assets[0].uri, "ai");
      const { count } = await countWorkersFromPhoto(dataUrl);
      const unmarked = eligibleWorkers.filter((w) => !markedIds.has(w.id) && !selected.has(w.id));
      const toSelect = unmarked.slice(0, count).map((w) => w.id);
      if (toSelect.length === 0) {
        Alert.alert("No match", "Counted workers but everyone eligible is already marked or selected.");
        return;
      }
      setSelected((prev) => new Set([...prev, ...toSelect]));
      Alert.alert("Counted", `Found ${count} people — selected ${toSelect.length} unmarked worker(s). Review and save.`);
    } catch {
      Alert.alert("AI headcount failed", "Could not count workers from that photo. Try again or select manually.");
    } finally {
      setScanning(false);
    }
  }

  async function save() {
    const deviceLabel = managerMe?.name ?? describeDevice();
    for (const workerId of selected) {
      const otH = Number(otHours[workerId] ?? 0);
      const otR = Number(otRate[workerId] ?? defaultOtRate);
      const otAmount = otH > 0 ? otH * otR : 0;
      await markAttendance.mutateAsync({
        workGroupId,
        workerId,
        date,
        hoursWorked: paymentType === "Per hour" ? hours[workerId] ?? 8 : undefined,
        wageAmount: baseFor(workerId) + otAmount,
        overtimeHours: otH > 0 ? otH : undefined,
        overtimeRate: otH > 0 ? otR : undefined,
        harvestedKg: isHarvestGroup && harvestKg[workerId] ? Number(harvestKg[workerId]) : undefined,
        deviceLabel,
      });
    }
    setSelected(new Set());
    setHours({});
    setOtHours({});
    setOtRate({});
    setHarvestKg({});
    setExpandedId(null);
  }

  if (isLoading) return <LoadingView label="Loading attendance..." />;

  const totalDue = [...selected].reduce((sum, id) => sum + baseFor(id) + extraFor(id), 0);

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
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            {advancePerUnit > 0 || workerDays > 0 ? (
              <Card style={styles.payoutCard}>
                <Text style={styles.payoutTitle}>Payout so far</Text>
                <View style={styles.payoutRow}>
                  <Text style={styles.payoutMeta}>{workerDays} worker-days</Text>
                  <Text style={styles.payoutMeta}>Rate {fmtMoney(rate)}</Text>
                </View>
                {advancePerUnit > 0 ? (
                  <View style={styles.payoutRow}>
                    <Text style={styles.payoutMeta}>Advance paid</Text>
                    <Text style={[styles.payoutMeta, { color: colors.warning }]}>{fmtMoney(advancesPaid)}</Text>
                  </View>
                ) : null}
                {advancePerUnit > 0 ? (
                  <View style={styles.payoutRow}>
                    <Text style={styles.payoutLabel}>Held for final payout</Text>
                    <Text style={styles.payoutValue}>{fmtMoney(heldSoFar)}</Text>
                  </View>
                ) : null}
              </Card>
            ) : null}
            <Button title="Scan group photo to select workers" icon={Camera} variant="light" onPress={scanGroupPhoto} loading={scanning} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="No workers yet" subtitle="Ask the owner to add workers before marking attendance." />
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

              {isSelected && !marked && paymentType === "Per hour" ? (
                <View style={styles.hoursRow}>
                  <Text style={styles.hoursLabel}>Hours worked</Text>
                  <View style={styles.stepper}>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => setHours((cur) => ({ ...cur, [item.id]: Math.max(1, (cur[item.id] ?? 8) - 1) }))}
                    >
                      <Minus size={14} color={colors.primary} />
                    </Pressable>
                    <Text style={styles.stepperValue}>{hours[item.id] ?? 8}</Text>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => setHours((cur) => ({ ...cur, [item.id]: (cur[item.id] ?? 8) + 1 }))}
                    >
                      <Plus size={14} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {isSelected && !marked ? (
                <>
                  <Pressable style={styles.extraToggle} onPress={() => setExpandedId(expanded ? null : item.id)}>
                    <Text style={styles.extraToggleText}>
                      {isHarvestGroup ? "Kg picked" : "+ Overtime"}
                      {extraFor(item.id) > 0 ? ` (+${fmtMoney(extraFor(item.id))})` : ""}
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
        <View style={styles.footer}>
          <Button
            title={`Mark ${selected.size} present · ${fmtMoney(totalDue)}`}
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
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: colors.border },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  hoursRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
  hoursLabel: { fontSize: 12.5, color: colors.textMuted },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepperBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  stepperValue: { fontSize: 14, fontWeight: "700", color: colors.text, minWidth: 20, textAlign: "center" },
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
  payoutCard: { backgroundColor: colors.secondary, gap: 4 },
  payoutTitle: { fontSize: 12.5, fontWeight: "700", color: colors.text, marginBottom: 2 },
  payoutRow: { flexDirection: "row", justifyContent: "space-between" },
  payoutMeta: { fontSize: 12, color: colors.textMuted },
  payoutLabel: { fontSize: 13, fontWeight: "700", color: colors.text },
  payoutValue: { fontSize: 13, fontWeight: "700", color: colors.primary },
});
