import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text, TextInput } from "../../../components/Text";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Search,
  Sparkles,
  UserMinus,
  Users,
  Wallet,
  Wheat,
  X,
  Plus,
  UserPlus,
  Pencil,
  UserX,
  CalendarDays,
} from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { ChipSelect } from "../../../components/ChipSelect";
import { SelectOrType } from "../../../components/SelectOrType";
import { TextField } from "../../../components/TextField";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { colors, radius, shadow, spacing } from "../../../components/theme";
import { Avatar, Pill, RoundButton } from "../../../components/harvest";
import { todayIso, useAttendance } from "../hooks/useAttendance";
import { getCrops } from "../../../api/endpoints/crops";
import { useEstateStore } from "../../estate/store/estateStore";
import { useWorkGroups } from "../../work-groups/hooks/useWorkGroups";
import { describeDevice } from "../../../lib/device";
import { useSyncStore } from "../../../store/syncStore";
import { countWorkersFromPhoto, type SeasonEndResult } from "../../../api/endpoints/workGroups";
import { createWorker, updateWorker } from "../../../api/endpoints/workers";
import { deleteAttendance, getAttendanceByGroup } from "../../../api/endpoints/attendance";
import { compressToDataUrl } from "../../../lib/imageCompression";
import type { GroupLoan, Worker } from "../../../types/api";
import { isGateError } from "../../../api/errors";

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

type Tab = "attendance" | "history" | "payments" | "loans";

function fmtDay(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

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
  // Day being marked - today by default, or an earlier day to add or fix it.
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [showDatePicker, setShowDatePicker] = useState(false);
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
    generateSeasonAccount,
    removeWorker,
  } = useAttendance(workGroupId, selectedDate);
  const { data: workGroups } = useWorkGroups();
  const workGroup = workGroups?.find((g) => g.id === workGroupId);
  const rate = Number(workGroup?.rate ?? 0);
  const paymentType = workGroup?.paymentType ?? "Per day";
  const isHarvestGroup = paymentType === "Per kg";
  // Default OT rate: hourly-equivalent of the group's rate, matching the
  // backend's own fallback so the preview and the settled amount agree.
  const defaultOtRate = paymentType === "Per hour" ? rate : rate / 8;

  const [tab, setTab] = useState<Tab>("attendance");
  const [search, setSearch] = useState("");
  const navigation = useNavigation<any>();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Same day form as the web app: hours, overtime (one per-hour rate, hours
  // typed next to each person), harvest picking (crop + bonus rule, kg typed
  // next to each person) and the day's total headcount.
  const [hours, setHours] = useState("8");
  const [otMode, setOtMode] = useState(false);
  const [otRateAll, setOtRateAll] = useState("");
  const [otHours, setOtHours] = useState<Record<number, string>>({});
  const [pickMode, setPickMode] = useState(isHarvestGroup);
  const [pickCrop, setPickCrop] = useState("");
  const [harvestKg, setHarvestKg] = useState<Record<number, string>>({});
  const [totalPeople, setTotalPeople] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  // Picking-bonus rule editor (threshold kg + pay/kg above it). Prefilled
  // from the group's saved rule, editable inline like the web app.
  const [pickThreshold, setPickThreshold] = useState(
    workGroup?.harvestThresholdKg != null ? String(Number(workGroup.harvestThresholdKg)) : ""
  );
  const [pickBonus, setPickBonus] = useState(
    workGroup?.harvestBonusPerKg != null ? String(Number(workGroup.harvestBonusPerKg)) : ""
  );
  // The group's saved bonus rule can arrive after the first render (or be
  // refreshed from the server), so follow it until the owner types their own.
  const savedThreshold = workGroup?.harvestThresholdKg != null ? String(Number(workGroup.harvestThresholdKg)) : "";
  const savedBonus = workGroup?.harvestBonusPerKg != null ? String(Number(workGroup.harvestBonusPerKg)) : "";
  const [ruleEdited, setRuleEdited] = useState(false);
  useEffect(() => {
    if (workGroup?.paymentType === "Per kg") setPickMode(true);
  }, [workGroup?.paymentType]);
  useEffect(() => {
    if (ruleEdited) return;
    setPickThreshold(savedThreshold);
    setPickBonus(savedBonus);
  }, [savedThreshold, savedBonus, ruleEdited]);
  // "Total people working" starts from the day's saved headcount.
  useEffect(() => {
    setTotalPeople(workSession?.headcountIn != null ? String(workSession.headcountIn) : "");
  }, [selectedDate, workSession?.headcountIn]);
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const { data: crops = [] } = useQuery({
    queryKey: ["crops", activeEstateId],
    queryFn: getCrops,
    enabled: activeEstateId != null,
  });
  const queryClient = useQueryClient();
  // Home's worker count and today's wages come from the dashboard summary.
  const refreshDashboard = () => queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  // Every day this group worked, newest first - shown as "Attendance history"
  // so earlier days can be opened, checked and corrected.
  const historyQuery = useQuery({
    queryKey: ["attendance-history", workGroupId],
    queryFn: () => getAttendanceByGroup(workGroupId),
    enabled: !!workGroupId,
  });
  const [historyShown, setHistoryShown] = useState(7);
  const isOnline = useSyncStore((s) => s.isOnline);
  const insets = useSafeAreaInsets();

  // ── AI Group Attendance state ──────────────────────────────────────────────
  const [aiScanning, setAiScanning] = useState(false);
  const [aiResult, setAiResult] = useState<{ count: number; imagePreview: string } | null>(null);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // ── Single Person Face Attendance state ─────────────────────────────────────
  // Edit mode (pencil in the header): fix a worker's details, take back a
  // "present" saved by mistake (e.g. they were on leave), or remove a worker.
  const [editMode, setEditMode] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWage, setEditWage] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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
  const [loanWorkerName, setLoanWorkerName] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanNotes, setLoanNotes] = useState("");
  const [loanProofPhoto, setLoanProofPhoto] = useState<string | null>(null);
  const [loanPhotoBusy, setLoanPhotoBusy] = useState(false);
  const [loanNameFocused, setLoanNameFocused] = useState(false);
  const [creatingLoanWorker, setCreatingLoanWorker] = useState(false);
  // "+ Add worker": workers belong to the whole farm, so one added here also
  // shows in every other group's list.
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerPhone, setNewWorkerPhone] = useState("");
  const [newWorkerWage, setNewWorkerWage] = useState("");
  const [addingWorker, setAddingWorker] = useState(false);
  const [payLoanId, setPayLoanId] = useState<number | null>(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayMethod, setRepayMethod] = useState("cash");

  // ── Loan proof-photo viewer state ───────────────────────────────────────────
  const [viewProofLoan, setViewProofLoan] = useState<GroupLoan | null>(null);

  // ── Season-end account state ────────────────────────────────────────────────
  const [seasonResult, setSeasonResult] = useState<SeasonEndResult | null>(null);

  const markedIds = useMemo(
    () => new Set(attendance.filter((a) => a.workGroupId === workGroupId).map((a) => a.workerId)),
    [attendance, workGroupId]
  );

  const eligibleWorkers = workers.filter((w) => w.isActive);
  const presentIds = markedIds;

  function toggle(workerId: number) {
    if (selected.has(workerId)) {
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(workerId);
        return next;
      });
      return;
    }
    // Re-selecting someone already marked edits their day: start from what was
    // saved, so saving again (e.g. just to add the crop) never wipes their kg
    // or overtime.
    const saved = attendance.find((a) => a.workGroupId === workGroupId && a.workerId === workerId);
    if (saved) {
      const savedOt = Number(saved.overtimeHours ?? 0);
      const savedKg = Number(saved.harvestedKg ?? 0);
      if (savedOt > 0) {
        setOtMode(true);
        setOtHours((cur) => ({ ...cur, [workerId]: String(savedOt) }));
        if (!otRateAll && Number(saved.overtimeRate ?? 0) > 0) setOtRateAll(String(Number(saved.overtimeRate)));
      }
      if (savedKg > 0) {
        setPickMode(true);
        setHarvestKg((cur) => ({ ...cur, [workerId]: String(savedKg) }));
        if (!pickCrop && saved.harvestCrop) setPickCrop(saved.harvestCrop);
      }
      if (Number(saved.hoursWorked) > 0) setHours(String(Number(saved.hoursWorked)));
    }
    setSelected((prev) => new Set(prev).add(workerId));
  }

  const num = (v: string | undefined) => Math.max(0, parseFloat(v ?? "") || 0);
  const hoursNum = num(hours) || 8;
  const otPerHour = num(otRateAll) || defaultOtRate;
  const threshold = num(pickThreshold);
  const bonusPerKg = num(pickBonus);

  /** Day's pay before extras: kg x rate for per-kg groups, else the group rate. */
  function baseFor(workerId: number): number {
    if (isHarvestGroup) return num(harvestKg[workerId]) * rate;
    const base = paymentType === "Per hour" ? rate * hoursNum : rate;
    return base || Number(workers.find((w) => w.id === workerId)?.wageRate ?? 0);
  }

  /** Overtime and picking bonus on top of the base pay (same rules as the web app). */
  function extraFor(workerId: number): number {
    const ot = otMode ? num(otHours[workerId]) * otPerHour : 0;
    const kg = pickMode ? num(harvestKg[workerId]) : 0;
    const bonus = kg > 0 && threshold > 0 && bonusPerKg > 0 ? Math.max(0, kg - threshold) * bonusPerKg : 0;
    return ot + bonus;
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
    // as the web app does right before writing the day's attendance.
    if (pickMode) {
      const savedThreshold = Number(workGroup?.harvestThresholdKg ?? 0);
      const savedBonus = Number(workGroup?.harvestBonusPerKg ?? 0);
      if (threshold !== savedThreshold || bonusPerKg !== savedBonus) {
        try {
          await updateWorkGroup.mutateAsync({
            harvestThresholdKg: threshold > 0 ? String(threshold) : null,
            harvestBonusPerKg: bonusPerKg > 0 ? String(bonusPerKg) : null,
          });
        } catch {
          Alert.alert("Couldn't save the picking bonus rule", "Attendance will still be saved.");
        }
      }
    }
    // Re-check against the current active-worker list, not just the stale
    // `selected` ids - a worker removed after being selected (but before
    // Save was tapped) must not still get a wage entry written for them.
    const eligibleIds = new Set(eligibleWorkers.map((w) => w.id));
    const crop = pickCrop.trim();
    for (const workerId of selected) {
      if (!eligibleIds.has(workerId)) continue;
      const otH = otMode ? num(otHours[workerId]) : 0;
      const kg = pickMode ? num(harvestKg[workerId]) : 0;
      await markAttendance.mutateAsync({
        workGroupId,
        workerId,
        date,
        hoursWorked: hoursNum,
        wageAmount: Math.round((baseFor(workerId) + extraFor(workerId)) * 100) / 100,
        overtimeHours: otH > 0 ? otH : undefined,
        overtimeRate: otH > 0 ? Math.round(otPerHour * 100) / 100 : undefined,
        harvestedKg: kg > 0 ? kg : undefined,
        harvestCrop: kg > 0 && crop ? crop : undefined,
        deviceLabel,
      });
    }
    // "Total people working" - the full gang for the day, including people
    // not in the worker list - is kept on the day's work session.
    const count = parseInt(totalPeople, 10);
    if (count > 0 && count !== workSession?.headcountIn) {
      try {
        await startOrUpdateSession.mutateAsync({ date, headcountIn: count });
      } catch {
        Alert.alert("Attendance saved", "But the total people count could not be saved.");
      }
    }
    setSelected(new Set());
    setOtHours({});
    setHarvestKg({});
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
    } catch (err) {
      if (isGateError(err)) return; // the plan/wallet prompt already explained it
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

  const isToday = date === todayIso();

  useLayoutEffect(() => {
    navigation.setOptions({
      subtitle: [workGroup?.blockName, isToday ? "Today" : fmtDay(date)].filter(Boolean).join(" · "),
      // Nothing to edit until the group has workers.
      headerRight: () => eligibleWorkers.length === 0 && !editMode ? null : (
        <RoundButton
          icon={editMode ? Check : Pencil}
          label={editMode ? "Done editing" : "Edit workers"}
          onPress={() => {
            setEditMode((v) => !v);
            setEditingWorkerId(null);
          }}
        />
      ),
    });
  });

  if (isLoading) return <LoadingView label="Loading attendance..." />;

  const q = search.trim().toLowerCase();
  const visibleWorkers = q ? eligibleWorkers.filter((w) => w.name.toLowerCase().includes(q)) : eligibleWorkers;
  const presentCount = new Set([...selected, ...markedIds]).size;
  const absentCount = Math.max(0, eligibleWorkers.length - presentCount);

  const totalDue = [...selected].reduce((sum, id) => sum + baseFor(id) + extraFor(id), 0);

  const todayWage = attendance
    .filter((a) => a.workGroupId === workGroupId)
    .reduce((s, a) => s + Number(a.wageAmount), 0);
  const todayKg = attendance
    .filter((a) => a.workGroupId === workGroupId)
    .reduce((s, a) => s + Number(a.harvestedKg ?? 0), 0);
  const todayCount = attendance.filter((a) => a.workGroupId === workGroupId).length;

  const historyDays = (() => {
    const byDate = new Map<string, { date: string; count: number; kg: number; otHours: number; cost: number }>();
    for (const a of historyQuery.data ?? []) {
      const d = byDate.get(a.date) ?? { date: a.date, count: 0, kg: 0, otHours: 0, cost: 0 };
      d.count += 1;
      d.kg += Number(a.harvestedKg ?? 0);
      d.otHours += Number(a.overtimeHours ?? 0);
      d.cost += Number(a.wageAmount ?? 0);
      byDate.set(a.date, d);
    }
    return [...byDate.values()].sort((x, y) => (x.date < y.date ? 1 : -1));
  })();

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

  // Matches web's confirm-remove-worker copy exactly (attendance.tsx:1583-1588).
  function confirmRemoveWorker(worker: Worker) {
    Alert.alert(
      "Remove this worker?",
      `${worker.name}\n\nRemove when a worker has left the job or their final account is settled. They will no longer appear in any group's worker list. Past attendance, wages and loan records are kept, and you can bring the worker back from the Recycle Bin (in the menu).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove worker",
          style: "destructive",
          onPress: () => {
            removeWorker.mutate(worker.id, {
              onError: () => Alert.alert("Could not remove worker", "Please try again."),
            });
          },
        },
      ]
    );
  }

  // Mirrors web's handleSeasonEnd (attendance.tsx:451-470).
  async function handleSeasonEnd() {
    generateSeasonAccount.mutate(undefined, {
      onSuccess: (result: SeasonEndResult | null) => {
        if (result) setSeasonResult(result);
      },
      onError: () => {
        Alert.alert("Failed to generate season account", "Please try again.");
      },
    });
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

  // Mirrors web's saveLoan() unresolved-name branch (attendance.tsx:280-310):
  // prefer the picked/matched worker; otherwise create a new one by that name
  // before recording the loan.
  function startEditing(worker: Worker) {
    if (editingWorkerId === worker.id) {
      setEditingWorkerId(null);
      return;
    }
    setEditingWorkerId(worker.id);
    setEditName(worker.name);
    setEditPhone(worker.phone ?? "");
    setEditWage(worker.wageRate && Number(worker.wageRate) > 0 ? String(Number(worker.wageRate)) : "");
  }

  async function saveWorkerEdit(worker: Worker) {
    const name = editName.trim();
    if (!name || savingEdit) return;
    setSavingEdit(true);
    try {
      await updateWorker(worker.id, {
        name,
        phone: editPhone.trim() || null,
        ...(Number(editWage) > 0 ? { wageRate: String(Number(editWage)) } : {}),
      });
      setEditingWorkerId(null);
      refetch();
      refreshDashboard();
    } catch {
      Alert.alert("Could not save", "Please try again.");
    } finally {
      setSavingEdit(false);
    }
  }

  // Someone was saved as present but didn't come (on leave): remove that
  // day's entry so they aren't paid for it.
  function confirmMarkAbsent(worker: Worker) {
    const entry = attendance.find((a) => a.workGroupId === workGroupId && a.workerId === worker.id);
    if (!entry) return;
    Alert.alert(
      `Mark ${worker.name} absent?`,
      "Their attendance for this day is removed, so it won't count towards wages.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark absent",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAttendance(entry.id);
              setSelected((prev) => {
                const next = new Set(prev);
                next.delete(worker.id);
                return next;
              });
              setEditingWorkerId(null);
              refetch();
              historyQuery.refetch();
            } catch {
              Alert.alert("Could not mark absent", "Please try again.");
            }
          },
        },
      ],
    );
  }

  async function saveNewWorker() {
    const name = newWorkerName.trim();
    if (!name || addingWorker) return;
    if (eligibleWorkers.some((w) => w.name.trim().toLowerCase() === name.toLowerCase())) {
      Alert.alert("Already in the list", `${name} is already one of your workers.`);
      return;
    }
    const wage = newWorkerWage.trim();
    setAddingWorker(true);
    try {
      const w = await createWorker(name, {
        ...(newWorkerPhone.trim() ? { phone: newWorkerPhone.trim() } : {}),
        ...(wage && Number(wage) > 0 ? { wageRate: String(Number(wage)) } : {}),
      });
      setShowAddWorker(false);
      setNewWorkerName("");
      setNewWorkerPhone("");
      setNewWorkerWage("");
      if (!w) {
        Alert.alert("Saved offline", `${name} will be added when you're back online.`);
        return;
      }
      await refetch();
      refreshDashboard();
      // They're usually being added because they came today - tick them.
      setSelected((prev) => new Set(prev).add(w.id));
    } catch {
      Alert.alert("Could not add worker", "Please try again.");
    } finally {
      setAddingWorker(false);
    }
  }

  async function saveLoan() {
    // Guards a fast double-tap: the button's own disabled/loading state
    // only reflects createLoan.isPending / creatingLoanWorker AFTER this
    // function has already started setting them, so a second tap that
    // lands before React commits that state could otherwise create two
    // new workers for the same unmatched name.
    if (creatingLoanWorker || createLoan.isPending) return;
    const amt = parseFloat(loanAmount);
    const name = loanWorkerName.trim();
    if (!name || isNaN(amt) || amt <= 0) return;
    let workerId =
      loanWorkerId ??
      eligibleWorkers.find((w) => w.name.trim().toLowerCase() === name.toLowerCase())?.id ??
      null;
    if (workerId == null) {
      setCreatingLoanWorker(true);
      try {
        const w = await createWorker(name);
        if (!w) throw new Error("no response");
        workerId = w.id;
      } catch {
        Alert.alert("Could not add worker", "Please try again.");
        setCreatingLoanWorker(false);
        return;
      }
      setCreatingLoanWorker(false);
    }
    createLoan.mutate(
      {
        workerId,
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
          setLoanWorkerName("");
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
          <Banknote size={16} color={tab === "attendance" ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, tab === "attendance" && styles.tabTextActive]}>Attend</Text>
        </Pressable>
        <Pressable style={[styles.tabBtn, tab === "history" && styles.tabBtnActive]} onPress={() => setTab("history")}>
          <CalendarDays size={16} color={tab === "history" ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>History</Text>
        </Pressable>
        <Pressable style={[styles.tabBtn, tab === "payments" && styles.tabBtnActive]} onPress={() => setTab("payments")}>
          <Wallet size={16} color={tab === "payments" ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, tab === "payments" && styles.tabTextActive]}>Advance</Text>
        </Pressable>
        <Pressable style={[styles.tabBtn, tab === "loans" && styles.tabBtnActive]} onPress={() => setTab("loans")}>
          <CreditCard size={16} color={tab === "loans" ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, tab === "loans" && styles.tabTextActive]}>Loans</Text>
        </Pressable>
      </View>

      {tab === "attendance" ? (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={visibleWorkers}
          keyExtractor={(w) => String(w.id)}
          contentContainerStyle={{ padding: 20, paddingBottom: 150 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={{ gap: 12, marginBottom: 14 }}>
              {/* Canvas layout: count-from-photo + select-all, then search. Face
                  attendance lives on the header's scan button. */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button
                  title={aiScanning ? "Counting…" : workSession ? (workSession.checkOutAt ? "Work done" : workSession.checkInPhoto ? "Photo taken" : "Work started") : "Count from photo"}
                  variant="light"
                  icon={workSession ? CheckCircle2 : Camera}
                  onPress={handleGroupAttendanceScan}
                  loading={aiScanning}
                  disabled={!!workSession}
                  style={{ flex: 1 }}
                />
                <Button
                  title="All"
                  variant="secondary"
                  icon={Check}
                  onPress={() => setSelected(new Set(eligibleWorkers.filter((w) => !markedIds.has(w.id)).map((w) => w.id)))}
                />
              </View>
              <View style={styles.searchWrap}>
                <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search workers"
                  accessibilityLabel="Search workers"
                  style={styles.searchInput}
                />
              </View>
              <Button
                title={showAddWorker ? "Cancel" : "Add worker"}
                variant="light"
                icon={showAddWorker ? undefined : UserPlus}
                onPress={() => setShowAddWorker((v) => !v)}
              />
              {showAddWorker ? (
                <Card style={{ gap: spacing.sm }}>
                  <Text style={styles.formTitle}>New worker</Text>
                  <TextField
                    label="Name *"
                    autoCorrect={false}
                    autoCapitalize="words"
                    placeholder="e.g. Ramesh Jadhav"
                    value={newWorkerName}
                    onChangeText={setNewWorkerName}
                    autoFocus
                    containerStyle={{ marginBottom: 0 }}
                  />
                  <TextField
                    label="Phone (optional)"
                    placeholder="98765 43210"
                    keyboardType="phone-pad"
                    value={newWorkerPhone}
                    onChangeText={setNewWorkerPhone}
                    containerStyle={{ marginBottom: 0 }}
                  />
                  <TextField
                    label="Daily wage ₹ (optional)"
                    placeholder="e.g. 350"
                    keyboardType="number-pad"
                    value={newWorkerWage}
                    onChangeText={(v) => setNewWorkerWage(v.replace(/[^0-9]/g, ""))}
                    containerStyle={{ marginBottom: 0 }}
                  />
                  <Button title="Save worker" onPress={saveNewWorker} loading={addingWorker} disabled={!newWorkerName.trim()} />
                </Card>
              ) : null}
              {editMode ? (
                <View style={styles.editBanner}>
                  <Pencil size={16} color="#92600E" />
                  <Text style={styles.editBannerText}>
                    Tap a worker to change their name, phone or wage, mark them absent, or remove them. Tap ✓ above when done.
                  </Text>
                </View>
              ) : null}

              {!editMode ? (
              <Card style={{ gap: spacing.sm }}>
                <Text style={styles.fieldLabel}>Date</Text>
                <Pressable style={styles.dateInput} onPress={() => setShowDatePicker(true)} accessibilityRole="button">
                  <Text style={styles.dateText}>{fmtDay(date)}{isToday ? " · Today" : ""}</Text>
                </Pressable>
                {showDatePicker ? (
                  <DateTimePicker
                    value={new Date(`${date}T00:00:00`)}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "default"}
                    maximumDate={new Date()}
                    onChange={(event, picked) => {
                      setShowDatePicker(false);
                      if (event.type === "set" && picked) {
                        const d = new Date(picked.getTime() - picked.getTimezoneOffset() * 60_000);
                        setSelectedDate(d.toISOString().slice(0, 10));
                        setSelected(new Set());
                        setOtHours({});
                        setHarvestKg({});
                      }
                    }}
                  />
                ) : null}

                <TextField
                  label="Hours worked"
                  keyboardType="decimal-pad"
                  value={hours}
                  onChangeText={setHours}
                  containerStyle={{ marginBottom: 0 }}
                />

                <View style={[styles.modeBox, otMode && styles.modeBoxOt]}>
                  <Pressable
                    style={styles.modeHeader}
                    onPress={() => {
                      const on = !otMode;
                      setOtMode(on);
                      if (!on) {
                        setOtHours({});
                        setOtRateAll("");
                      }
                    }}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: otMode }}
                  >
                    <Text style={styles.modeTitle}>Overtime today?</Text>
                    <View style={[styles.modePill, otMode && { backgroundColor: "#D9861F" }]}>
                      <Text style={[styles.modePillText, otMode && { color: "#fff" }]}>{otMode ? "Yes" : "No"}</Text>
                    </View>
                  </Pressable>
                  {otMode ? (
                    <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
                      <TextField
                        label="Overtime pay (per hour)"
                        keyboardType="decimal-pad"
                        placeholder={String(Math.round(defaultOtRate * 100) / 100)}
                        value={otRateAll}
                        onChangeText={setOtRateAll}
                        containerStyle={{ marginBottom: 0 }}
                      />
                      <Text style={[styles.modeHint, { color: "#95530F" }]}>
                        Type the overtime hours next to each person who stayed longer - only they get the extra pay. Others stay at normal wage.
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={[styles.modeBox, pickMode && styles.modeBoxPick]}>
                  <Pressable
                    style={styles.modeHeader}
                    onPress={() => {
                      // Per-kg groups are always weighed - kg is their pay.
                      if (isHarvestGroup) return;
                      const on = !pickMode;
                      setPickMode(on);
                      if (!on) setHarvestKg({});
                    }}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: pickMode, disabled: isHarvestGroup }}
                  >
                    <Text style={styles.modeTitle}>Harvest picking today?</Text>
                    <View style={[styles.modePill, pickMode && { backgroundColor: "#1F9E5C" }]}>
                      <Text style={[styles.modePillText, pickMode && { color: "#fff" }]}>{pickMode ? "Yes - weighing" : "No"}</Text>
                    </View>
                  </Pressable>
                  {pickMode ? (
                    <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
                      <SelectOrType
                        label="Which crop did they pick?"
                        options={crops.map((c) => c.name)}
                        value={pickCrop}
                        onChange={setPickCrop}
                      />
                      <View style={{ flexDirection: "row", gap: spacing.sm }}>
                        <View style={{ flex: 1 }}>
                          <TextField
                            label="Target per person (kg)"
                            keyboardType="decimal-pad"
                            placeholder="e.g. 80"
                            value={pickThreshold}
                            onChangeText={(v) => {
                              setRuleEdited(true);
                              setPickThreshold(v);
                            }}
                            containerStyle={{ marginBottom: 0 }}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <TextField
                            label="Extra pay per kg above (₹)"
                            keyboardType="decimal-pad"
                            placeholder="e.g. 5"
                            value={pickBonus}
                            onChangeText={(v) => {
                              setRuleEdited(true);
                              setPickBonus(v);
                            }}
                            containerStyle={{ marginBottom: 0 }}
                          />
                        </View>
                      </View>
                      <Text style={[styles.modeHint, { color: "#1F7A4A" }]}>
                        Type each person's weighed kg next to their name below. Anyone above{" "}
                        {threshold > 0 ? `${threshold} kg` : "the target"} gets the extra pay added automatically.
                      </Text>
                    </View>
                  ) : null}
                </View>

                <TextField
                  label="Total people working"
                  keyboardType="number-pad"
                  placeholder="e.g. 12"
                  value={totalPeople}
                  onChangeText={(v) => setTotalPeople(v.replace(/[^0-9]/g, ""))}
                  containerStyle={{ marginBottom: 0 }}
                />
                <Text style={styles.modeHint}>Full gang size for the day - including people not in the worker list</Text>
              </Card>

              ) : null}

              {!editMode ? (
              <Text style={styles.modeHint}>
                Already-marked workers can be selected again to update their day - e.g. add picked kg or overtime after work is done. The new values replace the old ones.
              </Text>
              ) : null}

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

            </View>
          }
          ListFooterComponent={
            <View style={{ gap: 12, marginTop: 14 }}>
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
                    <Text style={styles.summaryLabel}>{isToday ? "Workers today" : "Workers"}</Text>
                    <Text style={styles.summaryValue}>{todayCount}</Text>
                  </View>
                  {todayKg > 0 ? (
                    <View style={{ alignItems: "center" }}>
                      <Text style={styles.summaryLabel}>{isToday ? "Picked today" : "Picked"}</Text>
                      <Text style={[styles.summaryValue, { color: "#1F9E5C" }]}>{todayKg.toLocaleString("en-IN")} kg</Text>
                    </View>
                  ) : null}
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.summaryLabel}>Labour cost</Text>
                    <Text style={[styles.summaryValue, { color: colors.primary }]}>{inr(todayWage)}</Text>
                  </View>
                </Card>
              ) : null}


              {overtimeSummary && overtimeSummary.pendingAmount + overtimeSummary.clearedAmount > 0 ? (
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

              {harvestBonusSummary && harvestBonusSummary.pendingAmount + harvestBonusSummary.clearedAmount > 0 ? (
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
            <EmptyState title="No workers yet" subtitle="Tap “Add worker” above to add your first worker." />
          }
          renderItem={({ item, index }) => {
            const marked = markedIds.has(item.id);
            const isSelected = selected.has(item.id);
            const first = index === 0;
            const last = index === visibleWorkers.length - 1;
            return (
              <View
                style={[
                  styles.workerRow,
                  first && styles.workerRowFirst,
                  last && styles.workerRowLast,
                  !last && styles.workerRowDivider,
                  marked && !isSelected && styles.workerRowMarked,
                ]}
              >
                <View style={styles.workerRowMain}>
                  <Pressable onPress={() => (editMode ? startEditing(item) : toggle(item.id))} style={styles.workerRowMainPressable}>
                    <Avatar name={item.name} index={item.id} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.workerName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {marked ? (
                        <Text style={styles.markedLabel}>{isSelected ? "Editing entry…" : "Marked present · tap to edit"}</Text>
                      ) : (
                        <Text style={styles.workerMeta}>
                          {paymentType === "Per day" ? "Daily" : paymentType} · ₹{rate}
                        </Text>
                      )}
                    </View>
                    {extraFor(item.id) > 0 ? <Pill text={`+₹${extraFor(item.id).toFixed(0)}`} tone="warn" /> : null}
                    {editMode ? (
                      <Pencil size={20} color={colors.textMuted} />
                    ) : marked && !isSelected ? (
                      <CheckCircle2 size={26} color={colors.success} />
                    ) : (
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected ? <Check size={18} color="#FFFFFF" strokeWidth={3} /> : null}
                      </View>
                    )}
                  </Pressable>
                </View>
                {editMode && editingWorkerId === item.id ? (
                  <View style={styles.extraFields}>
                    <TextField label="Name" value={editName} onChangeText={setEditName} autoCorrect={false} autoCapitalize="words" containerStyle={{ marginBottom: 0 }} />
                    <TextField
                      label="Phone"
                      keyboardType="phone-pad"
                      value={editPhone}
                      onChangeText={setEditPhone}
                      containerStyle={{ marginBottom: 0 }}
                    />
                    <TextField
                      label="Daily wage ₹"
                      keyboardType="number-pad"
                      value={editWage}
                      onChangeText={(v) => setEditWage(v.replace(/[^0-9]/g, ""))}
                      containerStyle={{ marginBottom: 0 }}
                    />
                    <Button title="Save changes" onPress={() => saveWorkerEdit(item)} loading={savingEdit} disabled={!editName.trim()} />
                    {marked ? (
                      <Button title={isToday ? "Mark absent today" : "Mark absent this day"} variant="secondary" icon={UserX} onPress={() => confirmMarkAbsent(item)} />
                    ) : null}
                    <Button title="Remove worker" variant="secondary" icon={UserMinus} onPress={() => confirmRemoveWorker(item)} />
                  </View>
                ) : null}
                {isSelected && !editMode && (pickMode || otMode) ? (
                  <View style={[styles.extraFields, { flexDirection: "row", gap: spacing.sm }]}>
                    {pickMode ? (
                      <View style={{ flex: 1 }}>
                        <TextField
                          label="Kg picked"
                          keyboardType="decimal-pad"
                          placeholder="kg"
                          value={harvestKg[item.id] ?? ""}
                          onChangeText={(v) => setHarvestKg((cur) => ({ ...cur, [item.id]: v }))}
                          containerStyle={{ marginBottom: 0 }}
                        />
                      </View>
                    ) : null}
                    {otMode ? (
                      <View style={{ flex: 1 }}>
                        <TextField
                          label="OT hours"
                          keyboardType="decimal-pad"
                          placeholder="OT hr"
                          value={otHours[item.id] ?? ""}
                          onChangeText={(v) => setOtHours((cur) => ({ ...cur, [item.id]: v }))}
                          containerStyle={{ marginBottom: 0 }}
                        />
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      ) : null}

      {tab === "history" ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 150, gap: 12 }} refreshControl={<RefreshControl refreshing={historyQuery.isRefetching} onRefresh={() => historyQuery.refetch()} />}>
          <Text style={styles.modeHint}>Every day this group worked. Tap a day to open it and see or change who came.</Text>
              {/* Attendance history: one row per day worked; tap to open that day. */}
              {historyDays.length > 0 ? (
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <Text style={styles.historyTitle}>ATTENDANCE HISTORY</Text>
                  {historyDays.slice(0, historyShown).map((d, i) => {
                    const open = d.date === date;
                    return (
                      <Pressable
                        key={d.date}
                        onPress={() => {
                          setSelectedDate(d.date);
                          setSelected(new Set());
                          setOtHours({});
                          setHarvestKg({});
                          setTab("attendance");
                        }}
                        style={({ pressed }) => [styles.historyRow, i > 0 && styles.historyDivider, open && { backgroundColor: colors.tint }, pressed && { opacity: 0.7 }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${fmtDay(d.date)}`}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.historyDate}>{fmtDay(d.date)}{d.date === todayIso() ? " · Today" : ""}</Text>
                          <Text style={styles.historyMeta} numberOfLines={1}>
                            {d.count} {d.count === 1 ? "worker" : "workers"}
                            {d.kg > 0 ? ` · ${d.kg.toLocaleString("en-IN")} kg` : ""}
                            {d.otHours > 0 ? ` · ${d.otHours} hr OT` : ""}
                          </Text>
                        </View>
                        <Text style={styles.historyAmount}>{inr(d.cost)}</Text>
                        {open ? <Check size={18} color={colors.primary} /> : null}
                      </Pressable>
                    );
                  })}
                  {historyDays.length > historyShown ? (
                    <Pressable style={styles.historyMore} onPress={() => setHistoryShown((n) => n + 14)} accessibilityRole="button">
                      <Text style={styles.historyMoreText}>Show earlier days ({historyDays.length - historyShown} more)</Text>
                    </Pressable>
                  ) : null}
                </Card>
              ) : null}

          {historyDays.length === 0 && !historyQuery.isLoading ? (
            <EmptyState title="No attendance yet" subtitle="Days you mark will show here." />
          ) : null}
        </ScrollView>
      ) : null}

      {tab === "payments" ? (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={advancePayments}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: spacing.xl }}
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
                    <Text style={[styles.summaryValue, { fontSize: 16.5, color: "#C77A2E" }]}>{inr(totalAdvancePaid)}</Text>
                  </View>
                  <Text style={styles.advCount}>
                    {advancePayments.length} payment{advancePayments.length !== 1 ? "s" : ""} recorded
                  </Text>
                </Card>
              ) : null}

              <Button title="Record advance payment" icon={Plus} onPress={openPaymentForm} variant="secondary" />

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

              {/* Season End Account trigger — gated exactly like web
                  (attendance.tsx:1052-1076): not closed yet + at least one
                  advance payment recorded. */}
              {!workGroup?.seasonClosed && advancePayments.length > 0 ? (
                <Card style={styles.seasonTriggerCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <View style={styles.seasonIconWrap}>
                      <Sparkles size={16} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.seasonTitle}>Season End Account</Text>
                      <Text style={styles.seasonSubtitle}>AI generates final settlement for all workers</Text>
                    </View>
                  </View>
                  <Button
                    title={generateSeasonAccount.isPending ? "Generating account…" : "Generate Season Account"}
                    onPress={handleSeasonEnd}
                    loading={generateSeasonAccount.isPending}
                  />
                </Card>
              ) : null}

              {/* AI season summary: live mutation result, or the persisted
                  seasonSummary so it still shows after leaving/returning. */}
              {seasonResult || workGroup?.seasonSummary ? (
                <Card style={{ gap: spacing.sm }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                    <Sparkles size={16} color={colors.primary} />
                    <Text style={[styles.formTitle, { color: colors.primary, flex: 1 }]}>Final Season Account</Text>
                    {workGroup?.seasonClosed ? (
                      <View style={styles.seasonClosedPill}>
                        <Text style={styles.seasonClosedPillText}>Closed</Text>
                      </View>
                    ) : null}
                  </View>
                  {seasonResult?.totals ? (
                    <View style={{ flexDirection: "row", gap: spacing.xs }}>
                      <View style={styles.seasonTile}>
                        <Text style={styles.advBoxLabel}>Total earned</Text>
                        <Text style={styles.seasonTileValue}>{inr(seasonResult.totals.totalEarned)}</Text>
                      </View>
                      <View style={[styles.seasonTile, { backgroundColor: "#FFF3E6" }]}>
                        <Text style={styles.advBoxLabel}>Group advance</Text>
                        <Text style={[styles.seasonTileValue, { color: "#C77A2E" }]}>{inr(seasonResult.totals.totalAdvancePaid)}</Text>
                      </View>
                      <View style={[styles.seasonTile, { backgroundColor: "#E8F7EF" }]}>
                        <Text style={styles.advBoxLabel}>Paid directly</Text>
                        <Text style={[styles.seasonTileValue, { color: "#1F9E5C" }]}>{inr(seasonResult.totals.totalWorkerPayments)}</Text>
                      </View>
                      <View style={[styles.seasonTile, { backgroundColor: "#FFF0C2" }]}>
                        <Text style={styles.advBoxLabel}>Remaining</Text>
                        <Text style={[styles.seasonTileValue, { color: colors.primary }]}>{inr(seasonResult.totals.totalRemaining)}</Text>
                      </View>
                    </View>
                  ) : null}
                  <Text style={styles.seasonSummaryText}>
                    {seasonResult?.aiSummary ?? workGroup?.seasonSummary}
                  </Text>
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
                  <Text style={[styles.summaryValue, { fontSize: 16.5, color: "#C77A2E" }]}>{inr(Number(item.totalAdvancePaid))}</Text>
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
          keyboardShouldPersistTaps="handled"
          data={groupLoans}
          keyExtractor={(l) => String(l.id)}
          contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: spacing.xl }}
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
                    <Text style={[styles.summaryValue, { fontSize: 16.5 }]}>{inr(Number(workGroup.loanTaken))}</Text>
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
                onPress={() => {
                  setShowLoanForm((v) => !v);
                  setLoanWorkerId(null);
                  setLoanWorkerName("");
                  setLoanNameFocused(false);
                }}
                variant="secondary"
              />

              {showLoanForm ? (
                <Card style={{ gap: spacing.sm }}>
                  <Text style={styles.formTitle}>Record Loan</Text>
                  <Text style={styles.ruleSubtitle}>Worker *</Text>
                  {/* Worker-name-input: type to filter existing workers, tap a
                      suggestion to link, or leave an unmatched name — it's
                      created as a new worker on save. Ports web's
                      worker-name-input.tsx exact/fuzzy-match logic. */}
                  <View style={{ position: "relative", zIndex: 20 }}>
                    <TextField
                      placeholder="Type worker name"
                      value={loanWorkerName}
                      onChangeText={(name) => {
                        setLoanWorkerName(name);
                        const q = name.trim().toLowerCase();
                        const m = eligibleWorkers.find((w) => w.name.trim().toLowerCase() === q);
                        setLoanWorkerId(m ? m.id : null);
                      }}
                      onFocus={() => setLoanNameFocused(true)}
                      onBlur={() => setTimeout(() => setLoanNameFocused(false), 150)}
                      containerStyle={{ marginBottom: 0 }}
                    />
                    {(() => {
                      const q = loanWorkerName.trim().toLowerCase();
                      const exact = eligibleWorkers.find((w) => w.name.trim().toLowerCase() === q);
                      const matches = (q
                        ? eligibleWorkers.filter((w) => w.name.toLowerCase().includes(q))
                        : eligibleWorkers
                      ).slice(0, 6);
                      const showList = loanNameFocused && (matches.length > 0 || (q.length > 0 && !exact));
                      if (!showList) return null;
                      return (
                        <Card style={styles.nameSuggestBox}>
                          {matches.map((w: Worker) => (
                            <Pressable
                              key={w.id}
                              onPress={() => {
                                setLoanWorkerName(w.name);
                                setLoanWorkerId(w.id);
                                setLoanNameFocused(false);
                              }}
                              style={styles.nameSuggestRow}
                            >
                              <Text style={styles.nameSuggestText}>{w.name}</Text>
                            </Pressable>
                          ))}
                          {q.length > 0 && !exact ? (
                            <View style={styles.nameSuggestNewRow}>
                              <Text style={styles.nameSuggestNewText}>
                                "{loanWorkerName.trim()}" will be saved as a new worker
                              </Text>
                            </View>
                          ) : null}
                        </Card>
                      );
                    })()}
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
                        <Text style={{ color: colors.danger, fontSize: 14.5 }}>Remove photo</Text>
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
                    title={creatingLoanWorker ? "Adding worker…" : createLoan.isPending ? "Saving…" : "Save Loan"}
                    onPress={saveLoan}
                    loading={createLoan.isPending || creatingLoanWorker}
                    disabled={!loanWorkerName.trim() || !loanAmount}
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
                    {item.proofPhotoUrl ? (
                      <Pressable style={styles.proofBadge} onPress={() => setViewProofLoan(item)}>
                        <Image source={{ uri: item.proofPhotoUrl }} style={styles.proofBadgeThumb} />
                        <Camera size={12} color="#3E6FB0" />
                        <Text style={styles.proofBadgeText}>Proof of loan</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={[styles.summaryValue, { fontSize: 16.5, color: colors.danger }]}>{inr(outstanding)}</Text>
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

      {tab === "attendance" && eligibleWorkers.length > 0 ? (
        <View style={[styles.bottomBar, { paddingBottom: 14 }]}>
          <View>
            <Text style={styles.bottomCount}>
              {presentCount} present · {absentCount} absent
            </Text>
            <Text style={styles.bottomTotal}>₹{Math.round(totalDue).toLocaleString("en-IN")}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title={selected.size > 0 ? `Save ${selected.size}` : "Save"}
              onPress={save}
              loading={markAttendance.isPending}
              disabled={selected.size === 0}
            />
          </View>
        </View>
      ) : null}

      {/* Full-screen loan proof-photo viewer — RN equivalent of web's
          LoanProofViewer (loan-proof.tsx:30-64). */}
      <Modal
        visible={viewProofLoan != null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewProofLoan(null)}
      >
        {viewProofLoan ? (
          <Pressable style={styles.proofModalBackdrop} onPress={() => setViewProofLoan(null)}>
            <View style={styles.proofModalHeader}>
              <View>
                <Text style={styles.proofModalTitle}>Proof of loan</Text>
                <Text style={styles.proofModalSubtitle}>
                  {viewProofLoan.workerName ?? "Worker"} · {inr(Number(viewProofLoan.amount))}
                </Text>
              </View>
              <Pressable onPress={() => setViewProofLoan(null)} hitSlop={10}>
                <X size={22} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.proofModalImageWrap}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <Image
                  source={{ uri: viewProofLoan.proofPhotoUrl ?? undefined }}
                  style={styles.proofModalImage}
                  resizeMode="contain"
                />
              </Pressable>
            </View>
            <View style={styles.proofModalFooter}>
              <Text style={styles.proofModalFooterText}>Loan given on {viewProofLoan.issuedDate}</Text>
            </View>
          </Pressable>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  offlineBanner: { backgroundColor: colors.amberBg, padding: spacing.sm },
  offlineText: { color: colors.warning, textAlign: "center", fontSize: 14 },

  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.muted,
    borderRadius: radius.pill,
    padding: 4,
    marginHorizontal: 20,
    marginTop: spacing.md,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 44,
    borderRadius: radius.pill,
  },
  tabBtnActive: { backgroundColor: "#fff", ...shadow },
  tabText: { fontSize: 14.5, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: colors.text, fontWeight: "800" },

  workerRow: { backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 12 },
  workerRowFirst: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  workerRowLast: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  workerRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  workerMeta: { fontSize: 14, color: colors.textMuted },
  searchWrap: { justifyContent: "center" },
  searchIcon: { position: "absolute", left: 14, zIndex: 1 },
  searchInput: {
    minHeight: 54,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingLeft: 44,
    paddingRight: 16,
    fontSize: 17,
    color: colors.text,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#5A4600",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  bottomCount: { fontSize: 14, color: colors.textMuted },
  bottomTotal: { fontSize: 26, fontWeight: "800", color: colors.text, lineHeight: 30 },
  workerRowMain: { flexDirection: "row", alignItems: "center" },
  workerRowMainPressable: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  removeWorkerBtn: { paddingLeft: spacing.sm, paddingVertical: spacing.xs },
  workerRowSelected: { borderColor: colors.primary, borderWidth: 2 },
  workerRowMarked: { opacity: 0.6 },
  workerName: { fontSize: 16.5, color: colors.text, fontWeight: "700" },
  markedLabel: { fontSize: 14, color: colors.primary },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  fieldLabel: { fontSize: 15.5, fontWeight: "500", color: colors.text },
  dateInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, backgroundColor: "#fff", minHeight: 48, justifyContent: "center" },
  dateText: { fontSize: 16, color: colors.text },
  modeBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm + 4 },
  modeBoxOt: { backgroundColor: "#FFF8EC", borderColor: "#FBD9AE" },
  modeBoxPick: { backgroundColor: "#EEF8F2", borderColor: "#BFE5CF" },
  modeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 36 },
  modeTitle: { fontSize: 15.5, fontWeight: "700", color: colors.text },
  modePill: { backgroundColor: "#EFEFF2", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  modePillText: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
  historyTitle: { fontSize: 13, fontWeight: "800", letterSpacing: 0.6, color: colors.textMuted, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs },
  historyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, minHeight: 56 },
  historyDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  historyDate: { fontSize: 15.5, fontWeight: "700", color: colors.text },
  historyMeta: { fontSize: 13.5, color: colors.textMuted, marginTop: 1 },
  historyAmount: { fontSize: 15.5, fontWeight: "700", color: colors.primary },
  historyMore: { paddingVertical: spacing.sm + 2, alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border },
  historyMoreText: { fontSize: 14.5, fontWeight: "700", color: colors.primary },
  editBanner: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", backgroundColor: "#FEF3C7", borderRadius: radius.md, padding: spacing.sm + 4 },
  editBannerText: { flex: 1, fontSize: 14, color: "#92600E", lineHeight: 19, fontWeight: "600" },
  modeHint: { fontSize: 12.5, color: colors.textMuted, lineHeight: 17 },
  extraFields: { marginTop: spacing.sm },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  ruleSubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  settleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  settleHeaderText: { color: "#fff", fontWeight: "700", fontSize: 14.5 },
  settleLine: { fontSize: 14.5, color: colors.text },
  settleLineMuted: { fontSize: 14, color: colors.textMuted },

  // Single Person Face Attendance card — web's purple/violet gradient
  // (from-primary to-violet-500) approximated as a flat violet, matching how
  // aiCard already uses a flat colors.primary instead of a real gradient (no
  // expo-linear-gradient in this app).
  faceCard: {
    flex: 1,
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: 24,
    padding: spacing.md - 2,
  },
  faceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  faceCardTitle: { fontSize: 14.5, fontWeight: "800", color: colors.accentInk, lineHeight: 19 },
  faceCardSubtitle: { fontSize: 12.5, color: colors.accentInkSoft, marginTop: 4, lineHeight: 16 },

  // AI Group Attendance card
  aiCard: {
    flex: 1,
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: spacing.md - 2,
  },
  aiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiCardTitle: { fontSize: 14.5, fontWeight: "800", color: "#fff", lineHeight: 19 },
  aiCardSubtitle: { fontSize: 12.5, color: "rgba(255,255,255,0.85)", marginTop: 4, lineHeight: 16 },
  aiResultCard: { backgroundColor: "#FFF0C2", borderColor: "#F0E4C2" },
  aiResultThumb: { width: 56, height: 56, borderRadius: radius.sm },
  aiResultCount: { fontSize: 22, fontWeight: "800", color: colors.primary },
  aiResultLabel: { fontSize: 14.5, color: colors.textMuted, fontWeight: "500" },
  aiResultNote: { fontSize: 13.5, color: colors.primary, fontWeight: "600", marginTop: 2 },

  // Work session card
  sessionHeader: { fontSize: 13, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5 },
  sessionDurationPill: { backgroundColor: "#FFF0C2", borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  sessionDurationText: { fontSize: 13.5, fontWeight: "700", color: colors.primary },
  sessionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sessionThumb: { width: 48, height: 48, borderRadius: radius.sm },
  sessionThumbPlaceholder: { backgroundColor: "#FFF0C2", alignItems: "center", justifyContent: "center" },
  sessionRowTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  sessionRowSubtitle: { fontSize: 13.5, color: colors.textMuted, marginTop: 1 },
  sessionActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
  },
  sessionActionText: { fontSize: 14, fontWeight: "700" },

  // Today's summary
  summaryCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13.5, color: colors.textMuted },
  summaryValue: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 2 },

  // Advance tab
  advTitle: { fontSize: 14.5, fontWeight: "700", color: "#C77A2E" },
  advBox: { flex: 1, backgroundColor: "#fff", borderRadius: radius.sm, padding: spacing.sm, alignItems: "center" },
  advBoxLabel: { fontSize: 12.5, color: colors.textMuted },
  advBoxValue: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 2 },
  advFreq: { fontSize: 13.5, color: "#C77A2E", marginTop: spacing.sm },
  advEmptyText: { fontSize: 14.5, color: colors.textMuted, marginTop: spacing.xs },
  advEmptySubtext: { fontSize: 13, color: colors.textMuted, marginTop: 2, textAlign: "center" },
  advCount: { fontSize: 13.5, color: colors.textMuted },
  advNotes: { fontSize: 13.5, color: colors.textMuted, fontStyle: "italic", marginTop: 2 },
  advPreviewBox: { backgroundColor: "#FFF3E6", borderRadius: radius.sm, padding: spacing.sm },
  advPreviewText: { fontSize: 14.5, fontWeight: "700", color: "#C77A2E" },
  advPreviewSubtext: { fontSize: 13, color: "#C77A2E", marginTop: 2 },
  formTitle: { fontSize: 16, fontWeight: "700", color: colors.text },

  // Season-end account
  seasonTriggerCard: {
    gap: spacing.sm,
    backgroundColor: "#FFF0C2",
    borderColor: "#F0E4C2",
    borderWidth: 2,
    borderStyle: "dashed",
  },
  seasonIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  seasonTitle: { fontSize: 15, fontWeight: "700", color: colors.primary },
  seasonSubtitle: { fontSize: 13, color: colors.primary, marginTop: 1 },
  seasonTile: { flex: 1, backgroundColor: "#FBF2D9", borderRadius: radius.sm, padding: spacing.sm, alignItems: "center" },
  seasonTileValue: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 2 },
  seasonClosedPill: { backgroundColor: "#FFF0C2", borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  seasonClosedPillText: { fontSize: 12.5, fontWeight: "600", color: colors.primary },
  seasonSummaryText: { fontSize: 14.5, color: colors.text, lineHeight: 18 },

  // Loans tab
  loanDaysText: { fontSize: 13.5, color: colors.danger, textAlign: "center", marginTop: spacing.sm },
  // Worker-name-input suggestion dropdown (item 4)
  nameSuggestBox: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 2,
    padding: 0,
    maxHeight: 176,
    overflow: "hidden",
    zIndex: 30,
    elevation: 6,
  },
  nameSuggestRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nameSuggestText: { fontSize: 15, color: colors.text },
  nameSuggestNewRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: "#FFF0C2",
  },
  nameSuggestNewText: { fontSize: 13.5, color: colors.primary },
  // Loan proof-photo badge + full-screen viewer (item 3)
  proofBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs + 2,
    backgroundColor: "#E4EEFB",
    borderWidth: 1,
    borderColor: "#C9DEF5",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
  },
  proofBadgeThumb: { width: 24, height: 24, borderRadius: 4 },
  proofBadgeText: { fontSize: 13, fontWeight: "600", color: "#3E6FB0" },
  proofModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)" },
  proofModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  proofModalTitle: { color: "#fff", fontSize: 15.5, fontWeight: "700" },
  proofModalSubtitle: { color: "#D1D5DB", fontSize: 14, marginTop: 2 },
  proofModalImageWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  proofModalImage: { width: "100%", height: "100%" },
  proofModalFooter: { padding: spacing.md, alignItems: "center" },
  proofModalFooterText: { color: "#E5E7EB", fontSize: 14.5, fontWeight: "500" },
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
  loanProofBtnText: { fontSize: 14.5, color: colors.textMuted },
  statusPill: { backgroundColor: "#FEF3C7", borderRadius: radius.pill, paddingHorizontal: spacing.xs + 2, paddingVertical: 1 },
  statusPillText: { fontSize: 12.5, fontWeight: "600", color: "#92600E" },
  repayToggle: { backgroundColor: "#FFF0C2", borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  repayToggleText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  repayForm: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
});
