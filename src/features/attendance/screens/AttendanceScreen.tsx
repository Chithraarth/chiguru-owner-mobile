import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  Banknote,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  CreditCard,
  Sparkles,
  Users,
  Wallet,
  Wheat,
  X,
} from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { ChipSelect } from "../../../components/ChipSelect";
import { TextField } from "../../../components/TextField";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { useAttendance } from "../hooks/useAttendance";
import { useWorkGroups } from "../../work-groups/hooks/useWorkGroups";
import { describeDevice } from "../../../lib/device";
import { useSyncStore } from "../../../store/syncStore";
import { countWorkersFromPhoto } from "../../../api/endpoints/workGroups";
import { compressToDataUrl } from "../../../lib/imageCompression";
import type { Worker } from "../../../types/api";

const SETTLEMENT_MODES: { value: string; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "final", label: "Final account" },
];

const PAY_FREQ_LABELS: Record<string, string> = {
  daily: "Daily",
  "weekly-5": "Every 5 days",
  "weekly-6": "Every 6 days",
  "weekly-7": "Every 7 days",
  monthly: "Monthly",
};

const REPAY_METHODS = ["cash", "salary deduction", "bank transfer", "installment"];

type Tab = "attendance" | "payments" | "loans";

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function sessionDuration(startIso: string, endIso: string): string {
  const mins = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m worked` : `${m}m worked`;
}

async function captureCameraPhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
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
    workSession,
    startOrUpdateSession,
    addSessionPhoto,
    checkoutSession,
    advancePayments,
    recordAdvancePayment,
    removeAdvancePayment,
    groupLoans,
    groupLoansLoading,
    createLoan,
    recordLoanRepayment,
  } = useAttendance(workGroupId);
  const { data: workGroups } = useWorkGroups();
  const workGroup = workGroups?.find((g) => g.id === workGroupId);
  const rate = Number(workGroup?.rate ?? 0);
  const paymentType = workGroup?.paymentType ?? "Per day";
  const isHarvestGroup = paymentType === "Per kg";
  // Default OT rate: hourly-equivalent of the group's rate, matching the
  // backend's own fallback so the preview and the settled amount agree.
  const defaultOtRate = paymentType === "Per hour" ? rate : rate / 8;

  const [tab, setTab] = useState<Tab>("attendance");
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

  // ── AI Group Attendance state ──────────────────────────────────────────────
  const [aiScanning, setAiScanning] = useState(false);
  const [aiResult, setAiResult] = useState<{ count: number; imagePreview: string } | null>(null);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // ── Advance payment form state ──────────────────────────────────────────────
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payPeriodLabel, setPayPeriodLabel] = useState("");
  const [payDaysCount, setPayDaysCount] = useState("");
  const [payWorkerCount, setPayWorkerCount] = useState("");
  const [payAdvancePerWorkerPerDay, setPayAdvancePerWorkerPerDay] = useState("");
  const [payNotes, setPayNotes] = useState("");

  // ── Loan form state ──────────────────────────────────────────────────────────
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [loanWorkerId, setLoanWorkerId] = useState<number | null>(null);
  const [loanAmount, setLoanAmount] = useState("");
  const [loanNotes, setLoanNotes] = useState("");
  const [loanProofPhoto, setLoanProofPhoto] = useState<string | null>(null);
  const [loanPhotoBusy, setLoanPhotoBusy] = useState(false);
  const [payLoanId, setPayLoanId] = useState<number | null>(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayMethod, setRepayMethod] = useState("cash");

  const markedIds = useMemo(
    () => new Set(attendance.filter((a) => a.workGroupId === workGroupId).map((a) => a.workerId)),
    [attendance, workGroupId]
  );

  const eligibleWorkers = workers.filter((w) => w.isActive);
  const presentIds = markedIds;

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
    setAiResult(null);
  }

  // ── AI Group Attendance: camera → AI headcount → pre-select unmarked
  // workers → start today's work session. Mirrors web's handleCameraScan
  // (attendance.tsx:343-395) including the Math.min(count, unmarked.length)
  // pre-selection.
  async function handleGroupAttendanceScan() {
    if (workSession) return; // already checked in today
    const uri = await captureCameraPhoto();
    if (!uri) return;
    setAiScanning(true);
    setAiResult(null);
    try {
      const aiPhoto = await compressToDataUrl(uri, "ai");
      const { count } = await countWorkersFromPhoto(aiPhoto);
      setAiResult({ count, imagePreview: aiPhoto });
      const unmarked = eligibleWorkers.filter((w) => !presentIds.has(w.id));
      const toSelect = unmarked.slice(0, count);
      setSelected(new Set(toSelect.map((w) => w.id)));
      // Start today's work session (check-in time + arrival photo). Idempotent
      // on the server: an open session for the day is reused, not duplicated.
      try {
        const recordPhoto = await compressToDataUrl(uri, "record");
        await startOrUpdateSession.mutateAsync({
          date,
          checkInPhoto: recordPhoto,
          headcountIn: count,
        });
        Alert.alert(`AI counted ${count} worker${count !== 1 ? "s" : ""}`, "Work started — pre-selected workers below.");
      } catch {
        Alert.alert(
          `AI counted ${count} worker${count !== 1 ? "s" : ""}`,
          "Work start could not be saved — retry from the work session card."
        );
      }
    } catch {
      Alert.alert("AI scan failed", "Could not count workers from that photo. Try again.");
    } finally {
      setAiScanning(false);
    }
  }

  async function handleWorkUpdatePhoto() {
    if (!workSession) return;
    const uri = await captureCameraPhoto();
    if (!uri) return;
    setUpdatingPhoto(true);
    try {
      const photo = await compressToDataUrl(uri, "record");
      await addSessionPhoto.mutateAsync({ sessionId: workSession.id, data: { photo } });
    } catch {
      Alert.alert("Could not save the photo", "Please try again.");
    } finally {
      setUpdatingPhoto(false);
    }
  }

  async function handleCheckout() {
    if (!workSession) return;
    const uri = await captureCameraPhoto();
    if (!uri) return;
    setCheckingOut(true);
    try {
      const photo = await compressToDataUrl(uri, "record");
      // Best-effort AI headcount of the leaving photo — checkout still goes
      // through even if the count fails.
      let headcountOut: number | null = null;
      try {
        const aiPhoto = await compressToDataUrl(uri, "ai");
        const res = await countWorkersFromPhoto(aiPhoto);
        headcountOut = res.count ?? null;
      } catch {
        // count is optional
      }
      await checkoutSession.mutateAsync({
        sessionId: workSession.id,
        data: { checkOutPhoto: photo, headcountOut },
      });
    } catch {
      Alert.alert("Could not end work", "Please try again.");
    } finally {
      setCheckingOut(false);
    }
  }

  if (isLoading) return <LoadingView label="Loading attendance..." />;

  const totalDue = [...selected].reduce((sum, id) => {
    const base = isHarvestGroup ? Number(harvestKg[id] ?? 0) * rate : paymentType === "Per hour" ? rate * 8 : rate;
    return sum + base + extraFor(id);
  }, 0);

  const todayWage = attendance
    .filter((a) => a.workGroupId === workGroupId)
    .reduce((s, a) => s + Number(a.wageAmount), 0);
  const todayKg = attendance
    .filter((a) => a.workGroupId === workGroupId)
    .reduce((s, a) => s + Number(a.harvestedKg ?? 0), 0);
  const todayCount = attendance.filter((a) => a.workGroupId === workGroupId).length;

  const advancePerDay = workGroup?.advancePerUnit ? Number(workGroup.advancePerUnit) : 0;
  const remainingPerDay = advancePerDay > 0 ? rate - advancePerDay : 0;
  const totalAdvancePaid = advancePayments.reduce((s, p) => s + Number(p.totalAdvancePaid), 0);

  // Advance form total = days x workers x rate, matching web's payFormTotal.
  const payFormTotal = (() => {
    const d = parseInt(payDaysCount, 10) || 0;
    const w = parseInt(payWorkerCount, 10) || 0;
    const a = parseFloat(payAdvancePerWorkerPerDay) || advancePerDay;
    return d * w * a;
  })();

  function openPaymentForm() {
    setPayAdvancePerWorkerPerDay(advancePerDay > 0 ? String(advancePerDay) : "");
    setPayPeriodLabel("");
    setPayDaysCount("");
    setPayWorkerCount("");
    setPayNotes("");
    setShowPaymentForm(true);
  }

  function saveAdvancePayment() {
    const adv = parseFloat(payAdvancePerWorkerPerDay) || advancePerDay;
    const days = parseInt(payDaysCount, 10);
    const wcount = parseInt(payWorkerCount, 10);
    if (!payPeriodLabel.trim() || !days || !wcount) return;
    recordAdvancePayment.mutate(
      {
        periodLabel: payPeriodLabel.trim(),
        daysCount: days,
        workerCount: wcount,
        advancePerWorkerPerDay: adv,
        paymentDate: date,
        notes: payNotes.trim() || undefined,
      },
      { onSuccess: () => setShowPaymentForm(false) }
    );
  }

  function confirmDeletePayment(payId: number) {
    Alert.alert("Delete this advance payment?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => removeAdvancePayment.mutate(payId) },
    ]);
  }

  async function onLoanProofPress() {
    const uri = await captureCameraPhoto();
    if (!uri) return;
    setLoanPhotoBusy(true);
    try {
      const photo = await compressToDataUrl(uri, "record");
      setLoanProofPhoto(photo);
    } catch {
      Alert.alert("Could not read the photo");
    } finally {
      setLoanPhotoBusy(false);
    }
  }

  function saveLoan() {
    const amt = parseFloat(loanAmount);
    if (loanWorkerId == null || isNaN(amt) || amt <= 0) return;
    createLoan.mutate(
      {
        workerId: loanWorkerId,
        workGroupId,
        amount: amt,
        issuedDate: date,
        repaymentMethod: "salary",
        notes: loanNotes.trim() || undefined,
        proofPhotoUrl: loanProofPhoto || undefined,
      },
      {
        onSuccess: () => {
          setShowLoanForm(false);
          setLoanWorkerId(null);
          setLoanAmount("");
          setLoanNotes("");
          setLoanProofPhoto(null);
        },
      }
    );
  }

  function saveRepayment(loanId: number, outstanding: number) {
    const amt = parseFloat(repayAmount);
    if (isNaN(amt) || amt <= 0) return;
    const cappedAmt = Math.min(amt, outstanding);
    if (cappedAmt < amt) {
      Alert.alert("Amount reduced", `Only ${inr(outstanding)} is outstanding — saving ${inr(cappedAmt)} instead.`);
    }
    recordLoanRepayment.mutate(
      { loanId, data: { date, amount: cappedAmt, method: repayMethod } },
      {
        onSuccess: () => {
          setPayLoanId(null);
          setRepayAmount("");
          setRepayMethod("cash");
        },
      }
    );
  }

  const totalLoaned = groupLoans.reduce((s, l) => s + Number(l.totalDue), 0);
  const totalRepaid = groupLoans.reduce((s, l) => s + Number(l.repaidAmount), 0);
  const loanOutstanding = totalLoaned - totalRepaid;
  const daysToRepay = rate > 0 && loanOutstanding > 0 ? Math.ceil(loanOutstanding / rate) : null;
  const unit = (paymentType ?? "").toLowerCase().replace(/^per\s+/, "").trim() || "day";
  const unitPlural = unit === "kg" ? "kg" : `${unit}s`;

  return (
    <View style={styles.container}>
      {!isOnline ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline — attendance will sync when you're back online</Text>
        </View>
      ) : null}

      <View style={styles.tabRow}>
        <Pressable style={[styles.tabBtn, tab === "attendance" && styles.tabBtnActive]} onPress={() => setTab("attendance")}>
          <Banknote size={14} color={tab === "attendance" ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, tab === "attendance" && styles.tabTextActive]}>Attend</Text>
        </Pressable>
        <Pressable style={[styles.tabBtn, tab === "payments" && styles.tabBtnActive]} onPress={() => setTab("payments")}>
          <Wallet size={14} color={tab === "payments" ? "#C77A2E" : colors.textMuted} />
          <Text style={[styles.tabText, tab === "payments" && { color: "#C77A2E" }]}>Advance</Text>
        </Pressable>
        <Pressable style={[styles.tabBtn, tab === "loans" && styles.tabBtnActive]} onPress={() => setTab("loans")}>
          <CreditCard size={14} color={tab === "loans" ? colors.danger : colors.textMuted} />
          <Text style={[styles.tabText, tab === "loans" && { color: colors.danger }]}>Loans</Text>
        </Pressable>
      </View>

      {tab === "attendance" ? (
        <FlatList
          data={eligibleWorkers}
          keyExtractor={(w) => String(w.id)}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
              {/* Group Attendance: AI headcount */}
              <Pressable
                style={[styles.aiCard, (aiScanning || !!workSession) && { opacity: 0.85 }]}
                onPress={handleGroupAttendanceScan}
                disabled={aiScanning || !!workSession}
              >
                <View style={styles.aiIconWrap}>
                  {aiScanning ? (
                    <ActivityIndicator color="#fff" />
                  ) : workSession ? (
                    <CheckCircle2 size={20} color="#fff" />
                  ) : (
                    <Camera size={20} color="#fff" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiCardTitle}>Group Attendance</Text>
                  <Text style={styles.aiCardSubtitle}>
                    {aiScanning
                      ? "AI is counting heads…"
                      : workSession
                        ? workSession.checkOutAt
                          ? "Work done for this day"
                          : `Work started at ${fmtTime(workSession.checkInAt)}`
                        : "Arrival photo — AI counts heads & time is noted"}
                  </Text>
                </View>
              </Pressable>

              {aiResult ? (
                <Card style={styles.aiResultCard}>
                  <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
                    <Image source={{ uri: aiResult.imagePreview }} style={styles.aiResultThumb} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Users size={16} color={colors.primary} />
                        <Text style={styles.aiResultCount}>{aiResult.count}</Text>
                        <Text style={styles.aiResultLabel}>people found</Text>
                      </View>
                      <Text style={styles.aiResultNote}>
                        ✓ {Math.min(aiResult.count, eligibleWorkers.filter((w) => !presentIds.has(w.id)).length)} workers
                        auto-selected below
                      </Text>
                    </View>
                  </View>
                </Card>
              ) : null}

              {/* Work session card: arrival → work photos → leaving */}
              {workSession ? (
                <Card style={{ gap: spacing.sm }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={styles.sessionHeader}>WORK SESSION</Text>
                    {workSession.checkOutAt ? (
                      <View style={styles.sessionDurationPill}>
                        <Text style={styles.sessionDurationText}>
                          {sessionDuration(workSession.checkInAt, workSession.checkOutAt)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.sessionRow}>
                    {workSession.checkInPhoto ? (
                      <Image source={{ uri: workSession.checkInPhoto }} style={styles.sessionThumb} />
                    ) : (
                      <View style={[styles.sessionThumb, styles.sessionThumbPlaceholder]}>
                        <Users size={18} color={colors.primary} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessionRowTitle}>Came to work · {fmtTime(workSession.checkInAt)}</Text>
                      {workSession.headcountIn != null ? (
                        <Text style={styles.sessionRowSubtitle}>
                          {workSession.headcountIn} {workSession.headcountIn === 1 ? "person" : "people"} working
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {(workSession.updatePhotos ?? []).map((p, i) => (
                    <View key={i} style={styles.sessionRow}>
                      <Image source={{ uri: p.photo }} style={styles.sessionThumb} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sessionRowTitle}>Work update {i + 1} · {fmtTime(p.takenAt)}</Text>
                      </View>
                    </View>
                  ))}

                  {workSession.checkOutAt ? (
                    <View style={styles.sessionRow}>
                      {workSession.checkOutPhoto ? (
                        <Image source={{ uri: workSession.checkOutPhoto }} style={styles.sessionThumb} />
                      ) : (
                        <View style={[styles.sessionThumb, { backgroundColor: "#FFF3E6" }]}>
                          <Users size={18} color="#C77A2E" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sessionRowTitle}>Left work · {fmtTime(workSession.checkOutAt)}</Text>
                        {workSession.headcountOut != null ? (
                          <Text style={styles.sessionRowSubtitle}>
                            {workSession.headcountOut} {workSession.headcountOut === 1 ? "person" : "people"} counted leaving
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", gap: spacing.sm }}>
                      <Pressable
                        style={[styles.sessionActionBtn, { backgroundColor: "#E4EEFB" }]}
                        onPress={handleWorkUpdatePhoto}
                        disabled={updatingPhoto || (workSession.updatePhotos ?? []).length >= 2}
                      >
                        {updatingPhoto ? (
                          <ActivityIndicator size="small" color="#3E6FB0" />
                        ) : (
                          <Camera size={16} color="#3E6FB0" />
                        )}
                        <Text style={[styles.sessionActionText, { color: "#3E6FB0" }]}>
                          Work photo ({(workSession.updatePhotos ?? []).length}/2)
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.sessionActionBtn, { backgroundColor: "#C77A2E" }]}
                        onPress={handleCheckout}
                        disabled={checkingOut}
                      >
                        {checkingOut ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Camera size={16} color="#fff" />
                        )}
                        <Text style={[styles.sessionActionText, { color: "#fff" }]}>
                          {checkingOut ? "Ending…" : "Leaving — end work"}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </Card>
              ) : null}

              {/* Today's summary */}
              {todayCount > 0 ? (
                <Card style={styles.summaryCard}>
                  <View style={{ alignItems: "flex-start" }}>
                    <Text style={styles.summaryLabel}>Workers today</Text>
                    <Text style={styles.summaryValue}>{todayCount}</Text>
                  </View>
                  {isHarvestGroup && todayKg > 0 ? (
                    <View style={{ alignItems: "center" }}>
                      <Text style={styles.summaryLabel}>Picked today</Text>
                      <Text style={[styles.summaryValue, { color: "#1F9E5C" }]}>{todayKg.toLocaleString("en-IN")} kg</Text>
                    </View>
                  ) : null}
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.summaryLabel}>Labour cost</Text>
                    <Text style={[styles.summaryValue, { color: colors.primary }]}>{inr(todayWage)}</Text>
                  </View>
                </Card>
              ) : null}

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
      ) : null}

      {tab === "payments" ? (
        <FlatList
          data={advancePayments}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
              {advancePerDay > 0 ? (
                <Card style={{ backgroundColor: "#FFF3E6", borderColor: "#FBD9AE" }}>
                  <Text style={styles.advTitle}>Advance Payment Structure</Text>
                  <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                    <View style={styles.advBox}>
                      <Text style={styles.advBoxLabel}>Total rate</Text>
                      <Text style={styles.advBoxValue}>{inr(rate)}</Text>
                    </View>
                    <View style={styles.advBox}>
                      <Text style={styles.advBoxLabel}>Advance</Text>
                      <Text style={[styles.advBoxValue, { color: "#C77A2E" }]}>{inr(advancePerDay)}</Text>
                    </View>
                    <View style={styles.advBox}>
                      <Text style={styles.advBoxLabel}>Held</Text>
                      <Text style={[styles.advBoxValue, { color: colors.primary }]}>{inr(remainingPerDay)}</Text>
                    </View>
                  </View>
                  {workGroup?.payFrequency && workGroup.payFrequency !== "daily" ? (
                    <Text style={styles.advFreq}>
                      Pay schedule: {PAY_FREQ_LABELS[workGroup.payFrequency] ?? workGroup.payFrequency}
                    </Text>
                  ) : null}
                </Card>
              ) : (
                <Card style={{ alignItems: "center" }}>
                  <Wallet size={28} color={colors.textMuted} />
                  <Text style={styles.advEmptyText}>No advance setup for this group</Text>
                  <Text style={styles.advEmptySubtext}>Edit the group to add advance payment settings</Text>
                </Card>
              )}

              {advancePayments.length > 0 ? (
                <Card style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.summaryLabel}>Total advance paid</Text>
                    <Text style={[styles.summaryValue, { fontSize: 15, color: "#C77A2E" }]}>{inr(totalAdvancePaid)}</Text>
                  </View>
                  <Text style={styles.advCount}>
                    {advancePayments.length} payment{advancePayments.length !== 1 ? "s" : ""} recorded
                  </Text>
                </Card>
              ) : null}

              <Button title="+ Record advance payment" onPress={openPaymentForm} variant="secondary" />

              {showPaymentForm ? (
                <Card style={{ gap: spacing.sm }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={styles.formTitle}>Record Advance Payment</Text>
                    <Pressable onPress={() => setShowPaymentForm(false)} hitSlop={10}>
                      <X size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                  <TextField
                    label="Period label *"
                    placeholder="e.g. Week 1 (Days 1–5)"
                    value={payPeriodLabel}
                    onChangeText={setPayPeriodLabel}
                    containerStyle={{ marginBottom: 0 }}
                  />
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <TextField
                        label="Days covered *"
                        keyboardType="number-pad"
                        placeholder="5"
                        value={payDaysCount}
                        onChangeText={setPayDaysCount}
                        containerStyle={{ marginBottom: 0 }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextField
                        label="Workers *"
                        keyboardType="number-pad"
                        placeholder="12"
                        value={payWorkerCount}
                        onChangeText={setPayWorkerCount}
                        containerStyle={{ marginBottom: 0 }}
                      />
                    </View>
                  </View>
                  <TextField
                    label="Advance/worker/day (₹)"
                    keyboardType="decimal-pad"
                    placeholder={advancePerDay > 0 ? String(advancePerDay) : "200"}
                    value={payAdvancePerWorkerPerDay}
                    onChangeText={setPayAdvancePerWorkerPerDay}
                    containerStyle={{ marginBottom: 0 }}
                  />
                  <TextField
                    label="Notes"
                    placeholder="Optional notes…"
                    value={payNotes}
                    onChangeText={setPayNotes}
                    containerStyle={{ marginBottom: 0 }}
                  />
                  {payFormTotal > 0 ? (
                    <View style={styles.advPreviewBox}>
                      <Text style={styles.advPreviewText}>Total advance: {inr(payFormTotal)}</Text>
                      <Text style={styles.advPreviewSubtext}>
                        {payWorkerCount || "?"} workers × {payDaysCount || "?"} days × {inr(parseFloat(payAdvancePerWorkerPerDay) || advancePerDay)}/day
                      </Text>
                    </View>
                  ) : null}
                  <Button
                    title={recordAdvancePayment.isPending ? "Saving…" : `Save — ${inr(payFormTotal)} advance`}
                    onPress={saveAdvancePayment}
                    loading={recordAdvancePayment.isPending}
                    disabled={!payPeriodLabel.trim() || !payDaysCount || !payWorkerCount}
                  />
                </Card>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <EmptyState title="No advance payments recorded yet" subtitle="Record the first advance payment above." />
          }
          renderItem={({ item }) => (
            <Card style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workerName}>{item.periodLabel}</Text>
                  {item.workerCount != null && item.daysCount != null && item.advancePerWorkerPerDay != null ? (
                    <Text style={styles.sessionRowSubtitle}>
                      {item.workerCount} workers × {item.daysCount} days × {inr(Number(item.advancePerWorkerPerDay))}/day
                    </Text>
                  ) : null}
                  <Text style={styles.advCount}>{item.paymentDate}</Text>
                  {item.notes ? <Text style={styles.advNotes}>{item.notes}</Text> : null}
                </View>
                <View style={{ alignItems: "flex-end", gap: spacing.xs }}>
                  <Text style={[styles.summaryValue, { fontSize: 15, color: "#C77A2E" }]}>{inr(Number(item.totalAdvancePaid))}</Text>
                  <Pressable onPress={() => confirmDeletePayment(item.id)} hitSlop={8}>
                    <X size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>
            </Card>
          )}
        />
      ) : null}

      {tab === "loans" ? (
        <FlatList
          data={groupLoans}
          keyExtractor={(l) => String(l.id)}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
              {workGroup?.loanTaken != null && Number(workGroup.loanTaken) > 0 ? (
                <Card style={{ backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formTitle}>Loan taken by group (upfront)</Text>
                      {workGroup.loanNotes ? <Text style={styles.advCount}>{workGroup.loanNotes}</Text> : null}
                    </View>
                    <Text style={[styles.summaryValue, { fontSize: 15 }]}>{inr(Number(workGroup.loanTaken))}</Text>
                  </View>
                </Card>
              ) : null}

              {groupLoans.length > 0 ? (
                <Card style={{ backgroundColor: "#FDEAEA", borderColor: "#F5C6C6" }}>
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <View style={styles.advBox}>
                      <Text style={styles.advBoxLabel}>Total loaned</Text>
                      <Text style={styles.advBoxValue}>{inr(totalLoaned)}</Text>
                    </View>
                    <View style={styles.advBox}>
                      <Text style={styles.advBoxLabel}>Repaid</Text>
                      <Text style={[styles.advBoxValue, { color: colors.primary }]}>{inr(totalRepaid)}</Text>
                    </View>
                    <View style={styles.advBox}>
                      <Text style={styles.advBoxLabel}>Outstanding</Text>
                      <Text style={[styles.advBoxValue, { color: colors.danger }]}>{inr(loanOutstanding)}</Text>
                    </View>
                  </View>
                  {daysToRepay != null ? (
                    <Text style={styles.loanDaysText}>
                      ≈ {daysToRepay} {unitPlural} of work at {inr(rate)}/{unit} to repay
                    </Text>
                  ) : null}
                </Card>
              ) : null}

              <Button
                title={showLoanForm ? "Cancel" : "+ Record loan"}
                onPress={() => setShowLoanForm((v) => !v)}
                variant="secondary"
              />

              {showLoanForm ? (
                <Card style={{ gap: spacing.sm }}>
                  <Text style={styles.formTitle}>Record Loan</Text>
                  <Text style={styles.ruleSubtitle}>Worker *</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    {eligibleWorkers.map((w: Worker) => (
                      <Pressable
                        key={w.id}
                        onPress={() => setLoanWorkerId(w.id)}
                        style={[styles.workerChip, loanWorkerId === w.id && styles.workerChipSelected]}
                      >
                        <Text style={[styles.workerChipText, loanWorkerId === w.id && styles.workerChipTextSelected]}>
                          {w.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextField
                    label="Loan amount (₹) *"
                    keyboardType="decimal-pad"
                    placeholder="e.g. 2000"
                    value={loanAmount}
                    onChangeText={setLoanAmount}
                    containerStyle={{ marginBottom: 0 }}
                  />
                  {loanAmount && parseFloat(loanAmount) > 0 ? (
                    <View style={[styles.advPreviewBox, { backgroundColor: "#FDEAEA" }]}>
                      <Text style={[styles.advPreviewText, { color: colors.danger }]}>
                        {inr(parseFloat(loanAmount))} will be deducted from final settlement
                      </Text>
                    </View>
                  ) : null}
                  <TextField
                    label="Notes"
                    placeholder="Reason for loan…"
                    value={loanNotes}
                    onChangeText={setLoanNotes}
                    containerStyle={{ marginBottom: 0 }}
                  />
                  <Text style={styles.ruleSubtitle}>Proof of loan (photo)</Text>
                  {loanProofPhoto ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                      <Image source={{ uri: loanProofPhoto }} style={{ width: 72, height: 72, borderRadius: radius.sm }} />
                      <Pressable onPress={() => setLoanProofPhoto(null)}>
                        <Text style={{ color: colors.danger, fontSize: 13 }}>Remove photo</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable style={styles.loanProofBtn} onPress={onLoanProofPress} disabled={loanPhotoBusy}>
                      {loanPhotoBusy ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Camera size={18} color={colors.danger} />
                      )}
                      <Text style={styles.loanProofBtnText}>Take photo of handover</Text>
                    </Pressable>
                  )}
                  <Button
                    title={createLoan.isPending ? "Saving…" : "Save Loan"}
                    onPress={saveLoan}
                    loading={createLoan.isPending}
                    disabled={loanWorkerId == null || !loanAmount}
                  />
                </Card>
              ) : null}

              {groupLoansLoading ? <ActivityIndicator color={colors.danger} /> : null}
            </View>
          }
          ListEmptyComponent={
            !groupLoansLoading ? (
              <EmptyState title="No loans for workers in this group" subtitle="Record a loan above." />
            ) : null
          }
          renderItem={({ item }) => {
            const outstanding = Number(item.totalDue) - Number(item.repaidAmount);
            const isPaying = payLoanId === item.id;
            return (
              <Card style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                      <Text style={styles.workerName}>{item.workerName ?? "Worker"}</Text>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>{item.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.sessionRowSubtitle}>
                      Loaned {inr(Number(item.amount))} · {item.issuedDate}
                    </Text>
                    {Number(item.repaidAmount) > 0 ? (
                      <Text style={[styles.sessionRowSubtitle, { color: colors.primary }]}>
                        Repaid {inr(Number(item.repaidAmount))}
                      </Text>
                    ) : null}
                    {item.notes ? <Text style={styles.advNotes}>{item.notes}</Text> : null}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={[styles.summaryValue, { fontSize: 15, color: colors.danger }]}>{inr(outstanding)}</Text>
                    <Text style={styles.advCount}>outstanding</Text>
                    {item.status !== "repaid" && item.status !== "closed" && outstanding > 0 ? (
                      <Pressable
                        onPress={() => {
                          if (isPaying) setPayLoanId(null);
                          else {
                            setPayLoanId(item.id);
                            setRepayAmount("");
                            setRepayMethod("cash");
                          }
                        }}
                        style={styles.repayToggle}
                      >
                        <Text style={styles.repayToggleText}>{isPaying ? "Cancel" : "Record payment"}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                {isPaying ? (
                  <View style={styles.repayForm}>
                    <Text style={styles.formTitle}>Record repayment</Text>
                    <TextField
                      label={`Amount (max ${inr(outstanding)})`}
                      keyboardType="decimal-pad"
                      value={repayAmount}
                      onChangeText={setRepayAmount}
                      containerStyle={{ marginBottom: 0 }}
                    />
                    <View style={{ marginTop: spacing.sm }}>
                      <ChipSelect label="Method" options={REPAY_METHODS} value={repayMethod} onChange={setRepayMethod} />
                    </View>
                    <Button
                      title={recordLoanRepayment.isPending ? "Saving…" : "Save payment"}
                      onPress={() => saveRepayment(item.id, outstanding)}
                      loading={recordLoanRepayment.isPending}
                      disabled={!repayAmount}
                      size="compact"
                    />
                  </View>
                ) : null}
              </Card>
            );
          }}
        />
      ) : null}

      {tab === "attendance" && selected.size > 0 ? (
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

  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: 4,
    margin: spacing.md,
    marginBottom: 0,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  tabBtnActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 12.5, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: colors.primary },

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

  // AI Group Attendance card
  aiCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  aiIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiCardTitle: { fontSize: 14, fontWeight: "700", color: "#fff" },
  aiCardSubtitle: { fontSize: 11.5, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  aiResultCard: { backgroundColor: "#F3EEFB", borderColor: "#DDD0F0" },
  aiResultThumb: { width: 56, height: 56, borderRadius: radius.sm },
  aiResultCount: { fontSize: 22, fontWeight: "800", color: colors.primary },
  aiResultLabel: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
  aiResultNote: { fontSize: 11.5, color: colors.primary, fontWeight: "600", marginTop: 2 },

  // Work session card
  sessionHeader: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5 },
  sessionDurationPill: { backgroundColor: "#F3EEFB", borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  sessionDurationText: { fontSize: 11.5, fontWeight: "700", color: colors.primary },
  sessionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sessionThumb: { width: 48, height: 48, borderRadius: radius.sm },
  sessionThumbPlaceholder: { backgroundColor: "#F3EEFB", alignItems: "center", justifyContent: "center" },
  sessionRowTitle: { fontSize: 13.5, fontWeight: "600", color: colors.text },
  sessionRowSubtitle: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  sessionActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
  },
  sessionActionText: { fontSize: 12, fontWeight: "700" },

  // Today's summary
  summaryCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 11.5, color: colors.textMuted },
  summaryValue: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 2 },

  // Advance tab
  advTitle: { fontSize: 12.5, fontWeight: "700", color: "#C77A2E" },
  advBox: { flex: 1, backgroundColor: "#fff", borderRadius: radius.sm, padding: spacing.sm, alignItems: "center" },
  advBoxLabel: { fontSize: 10.5, color: colors.textMuted },
  advBoxValue: { fontSize: 13.5, fontWeight: "700", color: colors.text, marginTop: 2 },
  advFreq: { fontSize: 11.5, color: "#C77A2E", marginTop: spacing.sm },
  advEmptyText: { fontSize: 12.5, color: colors.textMuted, marginTop: spacing.xs },
  advEmptySubtext: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: "center" },
  advCount: { fontSize: 11.5, color: colors.textMuted },
  advNotes: { fontSize: 11.5, color: colors.textMuted, fontStyle: "italic", marginTop: 2 },
  advPreviewBox: { backgroundColor: "#FFF3E6", borderRadius: radius.sm, padding: spacing.sm },
  advPreviewText: { fontSize: 13, fontWeight: "700", color: "#C77A2E" },
  advPreviewSubtext: { fontSize: 11, color: "#C77A2E", marginTop: 2 },
  formTitle: { fontSize: 14.5, fontWeight: "700", color: colors.text },

  // Loans tab
  loanDaysText: { fontSize: 11.5, color: colors.danger, textAlign: "center", marginTop: spacing.sm },
  workerChip: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
  },
  workerChipSelected: { backgroundColor: colors.danger, borderColor: colors.danger },
  workerChipText: { fontSize: 12.5, color: colors.text },
  workerChipTextSelected: { color: "#fff", fontWeight: "600" },
  loanProofBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  loanProofBtnText: { fontSize: 13, color: colors.textMuted },
  statusPill: { backgroundColor: "#FEF3C7", borderRadius: radius.pill, paddingHorizontal: spacing.xs + 2, paddingVertical: 1 },
  statusPillText: { fontSize: 10.5, fontWeight: "600", color: "#92600E" },
  repayToggle: { backgroundColor: "#F3EEFB", borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  repayToggleText: { fontSize: 11, fontWeight: "600", color: colors.primary },
  repayForm: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
});
