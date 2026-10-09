import React, { useLayoutEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useInnerBack } from "../../../navigation/useInnerBack";
import { DEFAULT_PAY_CYCLE, PayCycleChip, PeriodBar, inPeriod, pastPeriods, resolvePeriod, todayIso, type PayCycle, type Period } from "../period";
import { useMyEstates } from "../../estate/hooks/useMyEstates";
import { useEstateStore } from "../../estate/store/estateStore";
import { Text } from "../../../components/Text";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Scale,
  Send,
  Trash2,
  Wheat, ClipboardList, Users
} from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { LoadingView, EmptyState } from "../../../components/StateViews";
import { Avatar, IconChip, ListCard, ListRow, Pill, SectionLabel, StatTiles, shortRupees } from "../../../components/harvest";
import { colors, radius, spacing, shadow } from "../../../components/theme";
import { getAllAttendance, getAdvancePayments, getWorkerMoney } from "../../../api/endpoints/attendance";
import {
  clearWorkGroup,
  getHarvestBonusSummary,
  getOvertimeSummary,
  getWorkGroups,
  settleHarvestBonus,
  settleOvertime,
  updateWorkGroup,
} from "../../../api/endpoints/workGroups";
import { getGroupLoans } from "../../../api/endpoints/loans";
import { getWorkerPayments, deleteWorkerPayment } from "../../../api/endpoints/workerPayments";
import { PaySheet } from "../components/PaySheet";
import { newClientId } from "../../../lib/idempotency";
import { useT } from "../../../lib/i18n";
import type { AttendanceRecord, WorkerMoney } from "../../../types/api";


function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", weekday: "short",
  });
}
function fmtRecordedAt(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
/** Rupees, with paise only when there are any (₹350, ₹512.50). */
function inr(n: number) {
  const whole = Math.abs(n - Math.round(n)) < 0.005;
  return `₹${n.toLocaleString("en-IN", whole ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtNum(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function LabourRecordsScreen({ navigation }: { navigation: any }) {
  const [openFolder, setOpenFolder] = useState<{ id: number | null; name: string } | null>(null);
  const [openWorker, setOpenWorker] = useState<{ id: number; name: string } | null>(null);
  // Back from a worker returns to their group, and from a group to the list.
  useInnerBack(navigation, openWorker != null || openFolder != null, () =>
    openWorker ? setOpenWorker(null) : setOpenFolder(null)
  );
  // Which dates the screen shows: this pay week by default. Chosen on the
  // group list and kept when a group is opened.
  const [period, setPeriod] = useState<Period>({ kind: "cycle", anchor: todayIso() });
  const view = period.kind === "all" ? "final" : "period";
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const myEstate = (useMyEstates().data ?? []).find((e) => e.id === activeEstateId);
  const farmCycle: PayCycle = myEstate?.payCycle
    ? { cycle: myEstate.payCycle, from: myEstate.payFrom ?? 6, to: myEstate.payTo ?? 5, toNextMonth: !!myEstate.payToNextMonth }
    : DEFAULT_PAY_CYCLE;
  const [showPaySheet, setShowPaySheet] = useState(false);
  const qc = useQueryClient();
  const { t } = useT();

  // Mirrors the web app's PageShell: title + back button swap one level at a
  // time — worker drill-down closes to the folder, folder closes to the list.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: openWorker ? openWorker.name : openFolder ? openFolder.name : t("farmAcct.labour"),
    });
  }, [navigation, openFolder, openWorker]);

  const { data: records = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance-all"],
    queryFn: getAllAttendance,
  });
  const { data: workGroups = [] } = useQuery({ queryKey: ["work-groups"], queryFn: getWorkGroups });
  const groupPayCycle = useMutation({
    mutationFn: (v: { id: number; c: PayCycle | null }) =>
      updateWorkGroup(
        v.id,
        v.c
          ? { payCycle: v.c.cycle, payFrom: v.c.from, payTo: v.c.to, payToNextMonth: v.c.toNextMonth }
          : { payCycle: null }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-groups"] }),
    onError: () => Alert.alert("Couldn't save the pay week", "Please try again."),
  });
  // A group's own pay cycle, or null when it follows the farm's.
  const ownCycleOf = (groupId: number | null): PayCycle | null => {
    const g = workGroups.find((x) => x.id === groupId);
    return g?.payCycle ? { cycle: g.payCycle, from: g.payFrom ?? 1, to: g.payTo ?? 6, toNextMonth: !!g.payToNextMonth } : null;
  };
  const startOf = (groupId: number | null): PayCycle => ownCycleOf(groupId) ?? farmCycle;

  const groupOpen = openFolder != null && openFolder.id != null;

  const { data: advances = [] } = useQuery({
    queryKey: ["advance-payments", openFolder?.id],
    queryFn: () => getAdvancePayments(openFolder!.id as number),
    enabled: groupOpen,
  });
  const { data: groupLoans = [] } = useQuery({
    queryKey: ["group-loans", openFolder?.id],
    queryFn: () => getGroupLoans(openFolder!.id as number),
    enabled: groupOpen,
  });
  const { data: overtimeSummary } = useQuery({
    queryKey: ["overtime-summary", openFolder?.id],
    queryFn: () => getOvertimeSummary(openFolder!.id as number),
    enabled: groupOpen,
  });
  const { data: harvestBonusSummary } = useQuery({
    queryKey: ["harvest-bonus-summary", openFolder?.id],
    queryFn: () => getHarvestBonusSummary(openFolder!.id as number),
    enabled: groupOpen,
  });
  const settleOvertimeMutation = useMutation({
    mutationFn: () => settleOvertime(openFolder!.id as number, newClientId()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["overtime-summary", openFolder?.id] }),
  });
  const settleHarvestBonusMutation = useMutation({
    mutationFn: () => settleHarvestBonus(openFolder!.id as number, newClientId()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["harvest-bonus-summary", openFolder?.id] }),
  });
  const { data: allPayments = [] } = useQuery({
    queryKey: ["worker-payments"],
    queryFn: () => getWorkerPayments(),
  });
  const payments = openFolder != null ? allPayments.filter((pm) => (pm.workGroupId ?? null) === openFolder.id) : [];
  const paymentsTotal = payments.reduce((s, pm) => s + Number(pm.amount), 0);

  // Per-employee all-time money summary (days, wages, loans, payments, netDue).
  const { data: workerMoney, isLoading: moneyLoading } = useQuery<WorkerMoney>({
    queryKey: ["worker-money", openWorker?.id],
    queryFn: () => getWorkerMoney(openWorker!.id),
    enabled: openWorker != null,
  });

  // Archive a fully-settled work group into Accounts history (idempotent server-side).
  const clearAccountMutation = useMutation({
    mutationFn: (id: number) => clearWorkGroup(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-groups"] });
      setOpenFolder(null);
    },
    onError: () => Alert.alert("Could not clear the account", "Please try again."),
  });

  function confirmDeletePayment(id: number) {
    Alert.alert("Delete this payment record?", undefined, [
      { text: t("scan.cancel"), style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteWorkerPayment(id);
          qc.invalidateQueries({ queryKey: ["worker-payments"] });
        },
      },
    ]);
  }

  if (isLoading) return <LoadingView label="Loading labour records..." />;

  // Cleared groups live in "Accounts history" — view-only, out of the active
  // folder list below.
  const clearedGroups = workGroups.filter((g) => g.clearedAt != null);
  const clearedIds = new Set(clearedGroups.map((g) => g.id));

  // Folders: one per active (not-yet-cleared) work group (+ orphaned group ids
  // referenced by records), plus "General Records" for entries with no group.
  const knownGroupIds = new Set(workGroups.map((g) => g.id));
  const orphanIds = [...new Set(records.filter((r) => r.workGroupId != null && !knownGroupIds.has(r.workGroupId)).map((r) => r.workGroupId as number))];
  const groupList = [
    ...workGroups.filter((g) => !clearedIds.has(g.id)).map((g) => ({ id: g.id, name: g.name })),
    ...orphanIds.filter((id) => !clearedIds.has(id)).map((id) => ({ id, name: records.find((r) => r.workGroupId === id)?.workGroupName ?? `Group #${id}` })),
  ];
  const generalRecords = records.filter((r) => r.workGroupId == null);

  const folders = [
    ...groupList.map((g) => {
      const recs = records.filter((r) => r.workGroupId === g.id);
      const wage = recs.reduce((s, r) => s + Number(r.wageAmount ?? 0), 0);
      const subtitle = recs.length === 0 ? "No records yet" : `${inr(wage)} wages`;
      return { id: g.id as number | null, name: g.name, subtitle, count: recs.length };
    }),
    {
      id: null,
      name: "General Records",
      subtitle: (() => {
        if (generalRecords.length === 0) return "Records without a group";
        const wage = generalRecords.reduce((s, r) => s + Number(r.wageAmount ?? 0), 0);
        return wage > 0 ? `${inr(wage)} wages` : `${generalRecords.length} entries`;
      })(),
      count: generalRecords.length,
    },
  ];

  const allFolderRecords = openFolder ? records.filter((r) => (r.workGroupId ?? null) === openFolder.id) : records;
  const groupStart = startOf(openFolder?.id ?? null);
  const range = resolvePeriod(period, groupStart);
  // Everything below shows only the chosen dates.
  const folderRecords = allFolderRecords.filter((r) => inPeriod(r.date, range));

  const group = groupOpen ? workGroups.find((g) => g.id === openFolder!.id) : undefined;
  const isCleared = group?.clearedAt != null;
  const groupRate = Number(group?.rate ?? 0);
  const isPerDay = (group?.paymentType ?? "").toLowerCase().includes("day");
  const advPerDay = Number(group?.advancePerUnit ?? 0);
  const hasAdvanceStructure = advPerDay > 0;
  const earnOf = (r: AttendanceRecord) => (r.wageAmount != null && r.wageAmount !== "" ? Number(r.wageAmount) : isPerDay ? groupRate : 0);

  const totalEarned = folderRecords.reduce((s, r) => s + earnOf(r), 0);
  const totalWorks = folderRecords.length;
  const recordedAdvances = advances.reduce((s, a) => s + Number(a.totalAdvancePaid), 0);
  const autoAdvances = totalWorks * advPerDay;
  const totalAdvances = hasAdvanceStructure ? autoAdvances : recordedAdvances;
  const loanTaken = groupLoans.reduce((s, l) => s + Number(l.amount), 0);
  const loanRepaid = groupLoans.reduce((s, l) => s + Number(l.repaidAmount), 0);
  const loanOutstanding = groupLoans.reduce((s, l) => s + Math.max(0, Number(l.totalDue) - Number(l.repaidAmount)), 0);
  const finalPayable = totalEarned - totalAdvances - loanOutstanding - paymentsTotal;

  // ── What's due for the chosen dates: earned in them, plus anything still
  // unpaid from before, less what was paid in them.
  const moneyOut = [
    ...payments.map((pm) => ({ date: pm.paymentDate, amount: Number(pm.amount) })),
    ...advances.map((a) => ({ date: a.paymentDate, amount: Number(a.totalAdvancePaid) })),
  ];
  const dueRecords = folderRecords;
  const paidInPeriod = moneyOut.filter((m) => inPeriod(m.date, range)).reduce((s, m) => s + m.amount, 0);
  const earlierPending = range.from
    ? Math.max(
        0,
        allFolderRecords.filter((r) => r.date < range.from!).reduce((s, r) => s + earnOf(r), 0) -
          moneyOut.filter((m) => m.date < range.from!).reduce((s, m) => s + m.amount, 0)
      )
    : 0;
  const dueDays = dueRecords.length;
  const dueEarned = dueRecords.reduce((s, r) => s + earnOf(r), 0);
  // Split what's due into base wages, overtime and picking bonus (same rule
  // as the worker account) so the extra over "works × rate" is explained.
  const bonusThreshold = Number(group?.harvestThresholdKg ?? 0);
  const bonusPerKg = Number(group?.harvestBonusPerKg ?? 0);
  const dueSplit = dueRecords.reduce(
    (acc, r) => {
      const wage = earnOf(r);
      const otH = Number(r.overtimeHours ?? 0);
      const ot = Math.min(wage, otH * Number(r.overtimeRate ?? 0));
      const kgAbove = bonusThreshold > 0 && bonusPerKg > 0 ? Math.max(0, Number(r.harvestedKg ?? 0) - bonusThreshold) : 0;
      const bonus = Math.min(wage - ot, kgAbove * bonusPerKg);
      acc.base += wage - ot - bonus;
      acc.ot += ot;
      acc.otHours += ot > 0 ? otH : 0;
      acc.bonus += bonus;
      acc.kgAbove += bonus > 0 ? kgAbove : 0;
      return acc;
    },
    { base: 0, ot: 0, otHours: 0, bonus: 0, kgAbove: 0 }
  );
  const dueAdvance = dueDays * advPerDay;
  // Advance-structure groups pay only the advance-per-day now; the rest is
  // held for the Final Account. Other groups pay everything earned since.
  const dueWages = hasAdvanceStructure ? dueAdvance : Math.max(0, dueEarned + earlierPending - paidInPeriod);

  const byDate = folderRecords.reduce<Record<string, AttendanceRecord[]>>((acc, r) => {
    (acc[r.date] = acc[r.date] || []).push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  // Distinct employees in this folder (for the per-person money drill-down).
  const folderWorkers = (() => {
    const map = new Map<number, { id: number; name: string; days: number; earned: number }>();
    for (const r of folderRecords) {
      if (r.workerId == null) continue;
      const w = map.get(r.workerId) ?? { id: r.workerId, name: r.workerName ?? "Unknown", days: 0, earned: 0 };
      w.days += 1;
      w.earned += earnOf(r);
      map.set(r.workerId, w);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  })();

  if (openFolder === null) {
    const shown = records;
    const allWages = shown.reduce((sum, r) => sum + (r.wageAmount != null && r.wageAmount !== "" ? Number(r.wageAmount) : 0), 0);
    const workerCount = new Set(shown.map((r) => r.workerId).filter((id) => id != null)).size;
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
        <StatTiles
          items={[
            { label: "Workers", value: String(workerCount), sub: "on record" },
            { label: "Wages", value: shortRupees(allWages), sub: "season" },
            { label: "Groups", value: String(groupList.length), sub: "active" },
          ]}
        />
        <SectionLabel>Your work groups</SectionLabel>
        <ListCard>
          {folders.map((f, i) => (
            <ListRow
              key={f.id ?? "general"}
              title={f.name}
              subtitle={f.subtitle}
              left={<IconChip icon={f.id == null ? ClipboardList : Users} index={i} size={46} />}
              right={
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {f.count > 0 ? <Pill text={String(f.count)} /> : null}
                  <ChevronRight size={18} color={colors.textMuted} />
                </View>
              }
              divider={i < folders.length - 1}
              onPress={() => {
                setPeriod({ kind: "cycle", anchor: todayIso() });
                setOpenFolder({ id: f.id, name: f.name });
              }}
            />
          ))}
        </ListCard>

        {clearedGroups.length > 0 ? (
          <View>
            <SectionLabel style={{ marginBottom: spacing.sm }}>Accounts history</SectionLabel>
            <View style={{ gap: spacing.sm }}>
              {clearedGroups.map((g) => (
                <Pressable key={g.id} onPress={() => { setPeriod({ kind: "all" }); setOpenFolder({ id: g.id, name: g.name }); }}>
                  <Card style={styles.folderRow}>
                    <View style={[styles.folderIcon, { backgroundColor: "#D8F3E6" }]}>
                      <CheckCircle2 size={20} color="#1F9E5C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.folderName}>{g.name}</Text>
                      <Text style={[styles.folderSubtitle, { color: "#1F9E5C" }]}>
                        Account cleared{g.clearedAt ? ` · ${formatDate(g.clearedAt)}` : ""}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </Card>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    );
  }

  // ── Per-employee money page (wages, loans, payments, net due) ──────────
  if (openWorker != null) {
    const m = workerMoney;
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
          {moneyLoading ? <LoadingView label="Loading account..." /> : null}

          {m ? (
            <>
              <Card style={[styles.netDueCard, m.netDue >= 0 ? styles.netDuePositive : styles.netDueNegative]}>
                <Text style={styles.netDueLabel}>
                  {m.netDue >= 0 ? "Balance to pay" : "Employee owes (advance/loan exceeds earnings)"}
                </Text>
                <Text style={[styles.netDueValue, { color: m.netDue >= 0 ? colors.primary : colors.danger }]}>
                  {inr(Math.abs(m.netDue))}
                </Text>
                {m.lastWorkedDate ? (
                  <Text style={styles.netDueMeta}>Last worked {formatDate(m.lastWorkedDate)}</Text>
                ) : null}
              </Card>

              <Card style={{ padding: 0, overflow: "hidden" }}>
                <Text style={styles.blockTitle}>ACCOUNT SUMMARY</Text>
                <View style={styles.simpleRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Calendar size={14} color={colors.primary} />
                    <Text style={styles.simpleRowMutedLabel}>Days worked</Text>
                  </View>
                  <Text style={styles.simpleRowTitle}>{m.totalDays}</Text>
                </View>
                {m.totalBaseWage != null ? (
                  <>
                    <View style={[styles.simpleRow, styles.periodRowBorder]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Banknote size={14} color={colors.primary} />
                        <Text style={styles.simpleRowMutedLabel}>Base wages ({m.totalDays} {m.totalDays === 1 ? "day" : "days"})</Text>
                      </View>
                      <Text style={styles.simpleRowTitle}>{inr(m.totalBaseWage)}</Text>
                    </View>
                    {(m.totalOvertimePaid ?? 0) > 0 ? (
                      <View style={[styles.simpleRow, styles.periodRowBorder]}>
                        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Clock3 size={14} color="#C77A2E" />
                          <Text style={styles.simpleRowMutedLabel}>Overtime ({fmtNum(m.totalOvertimeHours)} hr)</Text>
                        </View>
                        <Text style={[styles.simpleRowTitle, { color: "#C77A2E" }]}>+ {inr(m.totalOvertimePaid ?? 0)}</Text>
                      </View>
                    ) : null}
                    {(m.totalBonusAmount ?? 0) > 0 ? (
                      <View style={[styles.simpleRow, styles.periodRowBorder]}>
                        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Wheat size={14} color="#1F9E5C" />
                          <Text style={styles.simpleRowMutedLabel}>Picking bonus ({fmtNum(m.totalKgAboveTarget ?? 0)} kg above target)</Text>
                        </View>
                        <Text style={[styles.simpleRowTitle, { color: "#1F9E5C" }]}>+ {inr(m.totalBonusAmount ?? 0)}</Text>
                      </View>
                    ) : null}
                    <View style={[styles.simpleRow, styles.periodRowBorder]}>
                      <Text style={[styles.simpleRowMutedLabel, { fontWeight: "700", color: colors.text }]}>Wages earned</Text>
                      <Text style={styles.simpleRowTitle}>{inr(m.totalWage)}</Text>
                    </View>
                  </>
                ) : (
                  <View style={[styles.simpleRow, styles.periodRowBorder]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Banknote size={14} color={colors.primary} />
                      <Text style={styles.simpleRowMutedLabel}>Wages earned</Text>
                    </View>
                    <Text style={styles.simpleRowTitle}>{inr(m.totalWage)}</Text>
                  </View>
                )}
                <View style={[styles.simpleRow, styles.periodRowBorder]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <CreditCard size={14} color={colors.danger} />
                    <Text style={styles.simpleRowMutedLabel}>Loan pending</Text>
                  </View>
                  <Text style={[styles.simpleRowTitle, { color: m.loanOutstanding > 0 ? colors.danger : colors.textMuted }]}>
                    {m.loanOutstanding > 0 ? `− ${inr(m.loanOutstanding)}` : inr(0)}
                  </Text>
                </View>
                {m.loanTaken > 0 ? (
                  <Text style={styles.finalNote}>Loans taken {inr(m.loanTaken)} · already repaid {inr(m.loanRepaid)}</Text>
                ) : null}
                <View style={[styles.simpleRow, styles.periodRowBorder]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Send size={14} color="#1F9E92" />
                    <Text style={styles.simpleRowMutedLabel}>Payments received ({m.paymentsCount})</Text>
                  </View>
                  <Text style={[styles.simpleRowTitle, { color: m.paymentsTotal > 0 ? "#1F9E92" : colors.textMuted }]}>
                    {m.paymentsTotal > 0 ? `− ${inr(m.paymentsTotal)}` : inr(0)}
                  </Text>
                </View>
                <View style={[styles.finalTotal, { backgroundColor: m.netDue >= 0 ? colors.bg : "#FDEAEA" }]}>
                  <Text style={[styles.finalTotalLabel, { color: m.netDue >= 0 ? colors.primary : colors.danger }]}>Net due</Text>
                  <Text style={[styles.finalTotalValue, { color: m.netDue >= 0 ? colors.primary : colors.danger }]}>
                    {m.netDue >= 0 ? inr(m.netDue) : `− ${inr(Math.abs(m.netDue))}`}
                  </Text>
                </View>
              </Card>

              {m.days && m.days.length > 0 ? (
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <Text style={styles.blockTitle}>DAY BY DAY</Text>
                  {m.days.map((d, i) => (
                    <View key={`${d.date}-${i}`} style={[styles.dayRow, i > 0 && styles.periodRowBorder]}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={styles.simpleRowTitle}>
                          {formatDate(d.date)}
                          {d.groupName ? <Text style={styles.simpleRowMeta}>{`  ·  ${d.groupName}`}</Text> : null}
                        </Text>
                        <Text style={styles.simpleRowTitle}>{inr(d.total)}</Text>
                      </View>
                      <View style={styles.dayLine}>
                        <Text style={styles.simpleRowMeta}>Base wage</Text>
                        <Text style={styles.simpleRowMeta}>{inr(d.baseWage)}</Text>
                      </View>
                      {d.overtimeAmount > 0 ? (
                        <View style={styles.dayLine}>
                          <Text style={styles.simpleRowMeta}>
                            Overtime {fmtNum(d.overtimeHours)} hr × {inr(d.overtimeRate)}
                          </Text>
                          <Text style={[styles.simpleRowMeta, { color: "#C77A2E" }]}>+ {inr(d.overtimeAmount)}</Text>
                        </View>
                      ) : null}
                      {d.harvestedKg > 0 ? (
                        <View style={styles.dayLine}>
                          <Text style={[styles.simpleRowMeta, { flex: 1 }]}>
                            {`Picked ${fmtNum(d.harvestedKg)} kg${d.harvestCrop ? ` ${d.harvestCrop}` : ""}`}
                            {d.targetKg != null
                              ? d.kgAboveTarget > 0
                                ? ` · ${fmtNum(d.kgAboveTarget)} kg above ${fmtNum(d.targetKg)} kg × ${inr(d.bonusPerKg ?? 0)}`
                                : ` · target ${fmtNum(d.targetKg)} kg not crossed`
                              : ""}
                          </Text>
                          {d.bonusAmount > 0 ? (
                            <Text style={[styles.simpleRowMeta, { color: "#1F9E5C" }]}>+ {inr(d.bonusAmount)}</Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </Card>
              ) : null}

              <Pressable style={styles.payButton} onPress={() => setShowPaySheet(true)}>
                <Send size={16} color="#fff" />
                <Text style={styles.payButtonText}>
                  Pay {m.workerName.split(" ")[0]}{m.netDue > 0 ? ` ${inr(m.netDue)}` : ""}
                </Text>
              </Pressable>

              {m.loans.length > 0 ? (
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <Text style={styles.blockTitle}>LOANS</Text>
                  {m.loans.map((l, idx) => {
                    const left = Math.max(0, Number(l.totalDue) - Number(l.repaidAmount));
                    return (
                      <View key={l.id} style={[styles.simpleRow, idx > 0 && styles.periodRowBorder]}>
                        <View>
                          <Text style={styles.simpleRowTitle}>{inr(Number(l.amount))} loan</Text>
                          <Text style={styles.simpleRowMeta}>
                            {l.issuedDate ? formatDate(l.issuedDate) : ""} · repaid {inr(Number(l.repaidAmount))}
                          </Text>
                        </View>
                        <Text style={[styles.simpleRowValue, { color: left > 0 ? colors.danger : "#1F9E5C" }]}>
                          {left > 0 ? `${inr(left)} left` : "Cleared"}
                        </Text>
                      </View>
                    );
                  })}
                </Card>
              ) : null}

              {m.payments.length > 0 ? (
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <Text style={styles.blockTitle}>PAYMENTS RECEIVED</Text>
                  {m.payments.map((pm, idx) => (
                    <View key={pm.id} style={[styles.simpleRow, idx > 0 && styles.periodRowBorder]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.simpleRowTitle}>{formatDate(pm.paymentDate)}</Text>
                        <Text style={styles.simpleRowMeta}>{pm.methodLabel || pm.method}{pm.note ? ` · ${pm.note}` : ""}</Text>
                      </View>
                      <Text style={[styles.simpleRowValue, { color: "#1F9E92" }]}>{inr(Number(pm.amount))}</Text>
                    </View>
                  ))}
                </Card>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        <PaySheet
          visible={showPaySheet}
          groupId={openFolder?.id ?? null}
          groupName={openFolder?.name ?? ""}
          groupUpiId={group?.upiId}
          initialWorkerId={openWorker.id}
          suggestedAmount={m && m.netDue > 0 ? m.netDue : undefined}
          onClose={() => {
            setShowPaySheet(false);
            qc.invalidateQueries({ queryKey: ["worker-money", openWorker.id] });
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
        {groupOpen ? (
          <>
            <PayCycleChip
              value={groupStart}
              farm={farmCycle}
              editable={!isCleared}
              onChange={(c) => groupPayCycle.mutate({ id: openFolder!.id as number, c })}
            />
            <PeriodBar period={period} cycle={groupStart} onChange={setPeriod} />
          </>
        ) : (
          <PeriodBar period={period} cycle={groupStart} onChange={setPeriod} />
        )}

        {groupOpen && !isCleared ? (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <View style={styles.dueHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.blockTitleLight}>{period.kind === "cycle" ? "PAY PERIOD" : "PAYMENT FOR THESE DATES"}</Text>
                <Text style={styles.dueSubtitle}>
                  {range.label}
                  {period.kind === "cycle" && range.to ? (range.to === todayIso() ? " · pay today" : ` · pay on ${formatDate(range.to)}`) : ""}
                </Text>
              </View>
              <Text style={styles.dueHeaderValue}>{inr(Math.max(0, dueWages))}</Text>
            </View>
            {!hasAdvanceStructure && dueSplit.ot + dueSplit.bonus > 0 ? (
              <>
                <View style={styles.simpleRow}>
                  <Text style={styles.simpleRowMutedLabel}>
                    {`Base wages (${dueDays} work${dueDays !== 1 ? "s" : ""}${isPerDay && groupRate > 0 ? ` × ${inr(groupRate)}` : ""})`}
                  </Text>
                  <Text style={styles.simpleRowTitle}>{inr(dueSplit.base)}</Text>
                </View>
                {dueSplit.ot > 0 ? (
                  <View style={[styles.simpleRow, styles.periodRowBorder]}>
                    <Text style={styles.simpleRowMutedLabel}>{`Overtime (${fmtNum(dueSplit.otHours)} hr)`}</Text>
                    <Text style={[styles.simpleRowTitle, { color: "#C77A2E" }]}>+ {inr(dueSplit.ot)}</Text>
                  </View>
                ) : null}
                {dueSplit.bonus > 0 ? (
                  <View style={[styles.simpleRow, styles.periodRowBorder]}>
                    <Text style={[styles.simpleRowMutedLabel, { flex: 1 }]}>{`Picking bonus (${fmtNum(dueSplit.kgAbove)} kg above target)`}</Text>
                    <Text style={[styles.simpleRowTitle, { color: "#1F9E5C" }]}>+ {inr(dueSplit.bonus)}</Text>
                  </View>
                ) : null}
                <View style={[styles.simpleRow, styles.periodRowBorder]}>
                  <Text style={[styles.simpleRowMutedLabel, { fontWeight: "700", color: colors.text }]}>Wages due</Text>
                  <Text style={[styles.simpleRowTitle, { color: colors.primary }]}>{inr(dueEarned)}</Text>
                </View>
              </>
            ) : (
              <View style={styles.simpleRow}>
                <Text style={styles.simpleRowMutedLabel}>
                  {hasAdvanceStructure
                    ? `Advance due (${dueDays} × ${inr(advPerDay)})`
                    : `Wages due (${dueDays} work${dueDays !== 1 ? "s" : ""}${isPerDay && groupRate > 0 ? ` · ${inr(groupRate)}/day` : ""})`}
                </Text>
                <Text style={[styles.simpleRowTitle, { color: colors.primary }]}>
                  {inr(hasAdvanceStructure ? dueAdvance : dueEarned)}
                </Text>
              </View>
            )}
            {!hasAdvanceStructure && earlierPending > 0 ? (
              <View style={[styles.simpleRow, styles.periodRowBorder]}>
                <Text style={styles.simpleRowMutedLabel}>Still unpaid from earlier</Text>
                <Text style={[styles.simpleRowTitle, { color: colors.warning }]}>+ {inr(earlierPending)}</Text>
              </View>
            ) : null}
            {!hasAdvanceStructure && paidInPeriod > 0 ? (
              <View style={[styles.simpleRow, styles.periodRowBorder]}>
                <Text style={styles.simpleRowMutedLabel}>Already paid in these dates</Text>
                <Text style={[styles.simpleRowTitle, { color: "#1F9E92" }]}>− {inr(paidInPeriod)}</Text>
              </View>
            ) : null}
            <View style={[styles.simpleRow, styles.periodRowBorder]}>
              <Text style={styles.simpleRowMutedLabel}>Loan pending</Text>
              <Text style={[styles.simpleRowTitle, { color: loanOutstanding > 0 ? colors.danger : colors.textMuted }]}>
                {loanOutstanding > 0 ? inr(loanOutstanding) : inr(0)}
              </Text>
            </View>
            <View style={[styles.finalTotal, { backgroundColor: colors.bg }]}>
              <Text style={[styles.finalTotalLabel, { color: colors.primary }]}>To pay</Text>
              <Text style={[styles.finalTotalValue, { color: colors.primary }]}>{inr(Math.max(0, dueWages))}</Text>
            </View>
            {loanOutstanding > 0 && dueWages > 0 ? (
              <View style={styles.simpleRow}>
                <Text style={styles.simpleRowMeta}>If you cut the loan now</Text>
                <Text style={styles.simpleRowMeta}>
                  {inr(Math.max(0, dueWages - loanOutstanding))}
                  {loanOutstanding > dueWages ? ` (loan ${inr(loanOutstanding - dueWages)} still left)` : ""}
                </Text>
              </View>
            ) : null}
          </Card>
        ) : null}

        {openFolder !== null && !isCleared ? (
          <Pressable style={styles.payButton} onPress={() => setShowPaySheet(true)}>
            <Send size={16} color="#fff" />
            <Text style={styles.payButtonText}>Pay Workers</Text>
          </Pressable>
        ) : null}

        {groupOpen && allFolderRecords.length > 0 ? (() => {
          // Every pay period since this group's first record: wages, paid
          // and what's left, newest first. Tap one to open it above.
          const first = allFolderRecords.reduce((m, r) => (r.date < m ? r.date : m), allFolderRecords[0].date);
          const rows = pastPeriods(groupStart, first)
            .map((pp) => {
              const recs = allFolderRecords.filter((r) => r.date >= pp.from && r.date <= pp.to);
              const wages = recs.reduce((s2, r) => s2 + earnOf(r), 0);
              const paid = moneyOut.filter((m) => m.date >= pp.from && m.date <= pp.to).reduce((s2, m) => s2 + m.amount, 0);
              return { ...pp, works: recs.length, wages, paid };
            })
            .filter((r) => r.works > 0 || r.paid > 0);
          if (rows.length === 0) return null;
          return (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <Text style={styles.blockTitle}>PAY HISTORY</Text>
              {rows.map((r, i) => {
                const open = period.kind === "cycle" && range.from === r.from;
                const left = Math.max(0, r.wages - r.paid);
                return (
                  <Pressable
                    key={r.from}
                    onPress={() => setPeriod({ kind: "cycle", anchor: r.anchor })}
                    style={[styles.periodRow, i > 0 && styles.periodRowBorder, open && { backgroundColor: colors.tint }]}
                    accessibilityRole="button"
                  >
                    <View style={styles.periodRowTop}>
                      <Text style={styles.periodLabel}>{r.label}</Text>
                      <Text style={[styles.periodValue, { color: left > 0 ? colors.primary : "#1F9E5C" }]}>
                        {left > 0 ? inr(left) : "✓ Paid"}
                      </Text>
                    </View>
                    <View style={styles.periodMetaRow}>
                      <Text style={styles.periodMeta}>{r.works} work{r.works !== 1 ? "s" : ""}</Text>
                      <Text style={[styles.periodMeta, { color: colors.primary }]}>earned {inr(r.wages)}</Text>
                      {r.paid > 0 ? <Text style={[styles.periodMeta, { color: "#1F9E92" }]}>paid {inr(r.paid)}</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          );
        })() : null}

        {openFolder !== null && folderWorkers.length > 0 ? (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <View style={[styles.dueHeader, { paddingVertical: spacing.sm + 2 }]}>
              <Text style={styles.blockTitleLight}>EMPLOYEES</Text>
              <Text style={styles.dueSubtitle}>tap for wages, loans & payments</Text>
            </View>
            {folderWorkers.map((w, idx) => (
              <Pressable
                key={w.id}
                style={[styles.employeeRow, idx > 0 && styles.periodRowBorder]}
                onPress={() => setOpenWorker({ id: w.id, name: w.name })}
              >
                <Avatar name={w.name} index={idx} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.simpleRowTitle}>{w.name}</Text>
                  <Text style={styles.simpleRowMeta}>{w.days} day{w.days !== 1 ? "s" : ""} worked</Text>
                </View>
                <Text style={[styles.simpleRowValue, { color: colors.primary }]}>{inr(w.earned)}</Text>
                <ChevronRight size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </Card>
        ) : null}

        {groupOpen && view === "final" ? (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <View style={styles.finalHeader}>
              <Scale size={16} color="#fff" />
              <Text style={styles.finalHeaderText}>Final Account</Text>
            </View>
            <View style={styles.finalRow}>
              <View style={styles.finalRowLeft}>
                <Banknote size={14} color={colors.primary} />
                <Text style={styles.finalRowLabel}>Total earned ({folderRecords.length} days)</Text>
              </View>
              <Text style={styles.finalRowValue}>{inr(totalEarned)}</Text>
            </View>
            <View style={styles.finalRow}>
              <View style={styles.finalRowLeft}>
                <Text style={styles.finalRowLabel}>
                  {hasAdvanceStructure ? `Advances paid (${totalWorks} × ${inr(advPerDay)})` : "Advances paid"}
                </Text>
              </View>
              <Text style={[styles.finalRowValue, { color: colors.warning }]}>− {inr(totalAdvances)}</Text>
            </View>
            <View style={styles.finalRow}>
              <View style={styles.finalRowLeft}>
                <CreditCard size={14} color={colors.danger} />
                <Text style={styles.finalRowLabel}>Loan cut (outstanding)</Text>
              </View>
              <Text style={[styles.finalRowValue, { color: colors.danger }]}>− {inr(loanOutstanding)}</Text>
            </View>
            {loanTaken > 0 ? (
              <Text style={styles.finalNote}>Loans taken {inr(loanTaken)} · already repaid {inr(loanRepaid)}</Text>
            ) : null}
            {paymentsTotal > 0 ? (
              <View style={styles.finalRow}>
                <View style={styles.finalRowLeft}>
                  <Send size={14} color="#1F9E92" />
                  <Text style={styles.finalRowLabel}>Paid directly ({payments.length})</Text>
                </View>
                <Text style={[styles.finalRowValue, { color: "#1F9E92" }]}>− {inr(paymentsTotal)}</Text>
              </View>
            ) : null}
            <View style={[styles.finalTotal, { backgroundColor: finalPayable >= 0 ? colors.bg : "#FDEAEA" }]}>
              <Text style={[styles.finalTotalLabel, { color: finalPayable >= 0 ? colors.primary : colors.danger }]}>
                {finalPayable >= 0 ? "Balance to pay after harvest" : "Workers owe (advance/loan exceeds earnings)"}
              </Text>
              <Text style={[styles.finalTotalValue, { color: finalPayable >= 0 ? colors.primary : colors.danger }]}>
                {inr(Math.abs(finalPayable))}
              </Text>
            </View>
          </Card>
        ) : null}

        {groupOpen && view === "final" ? (
          isCleared ? (
            <View style={styles.clearedBanner}>
              <CheckCircle2 size={22} color="#1F9E5C" />
              <View style={{ flex: 1 }}>
                <Text style={styles.clearedBannerTitle}>Account cleared</Text>
                <Text style={styles.clearedBannerSubtitle}>
                  {group?.clearedAt
                    ? `Settled on ${formatDate(group.clearedAt)} — kept here in Accounts history.`
                    : "Kept here in Accounts history."}
                </Text>
              </View>
            </View>
          ) : (
            <Pressable
              style={styles.clearButton}
              onPress={() => {
                if (finalPayable > 0) {
                  Alert.alert(`${inr(finalPayable)} still to pay`, "Record the payment first, then clear the account.");
                  return;
                }
                if (!clearAccountMutation.isPending) clearAccountMutation.mutate(openFolder!.id as number);
              }}
            >
              <CheckCircle2 size={16} color="#fff" />
              <Text style={styles.clearButtonText}>
                {clearAccountMutation.isPending ? "Clearing…" : "Account cleared — everything is paid"}
              </Text>
            </Pressable>
          )
        ) : null}


        {groupOpen && view === "final" && overtimeSummary && overtimeSummary.pendingAmount + overtimeSummary.clearedAmount > 0 ? (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <View style={styles.settleHeader}>
              <Clock3 size={14} color="#fff" />
              <Text style={styles.settleHeaderText}>Overtime</Text>
            </View>
            <View style={styles.settleBody}>
              <View style={styles.finalRow}>
                <Text style={styles.finalRowLabel}>Pending ({overtimeSummary.pendingHours.toFixed(1)} hrs)</Text>
                <Text style={[styles.finalRowValue, { color: colors.warning }]}>{inr(overtimeSummary.pendingAmount)}</Text>
              </View>
              {overtimeSummary.clearedAmount > 0 ? (
                <View style={styles.finalRow}>
                  <Text style={styles.finalRowLabel}>Already paid out</Text>
                  <Text style={styles.finalRowValue}>{inr(overtimeSummary.clearedAmount)}</Text>
                </View>
              ) : null}
              {overtimeSummary.pendingAmount > 0 ? (
                <View style={{ padding: spacing.md }}>
                  <Button
                    title={`Mark ${inr(overtimeSummary.pendingAmount)} overtime as paid`}
                    variant="secondary"
                    onPress={() => settleOvertimeMutation.mutate()}
                    loading={settleOvertimeMutation.isPending}
                  />
                </View>
              ) : null}
            </View>
          </Card>
        ) : null}

        {groupOpen && view === "final" && harvestBonusSummary && harvestBonusSummary.pendingAmount + harvestBonusSummary.clearedAmount > 0 ? (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <View style={[styles.settleHeader, { backgroundColor: "#7CB342" }]}>
              <Wheat size={14} color="#fff" />
              <Text style={styles.settleHeaderText}>Picking bonus</Text>
            </View>
            <View style={styles.settleBody}>
              <View style={styles.finalRow}>
                <Text style={styles.finalRowLabel}>Pending ({harvestBonusSummary.pendingKg.toFixed(0)} kg)</Text>
                <Text style={[styles.finalRowValue, { color: colors.warning }]}>{inr(harvestBonusSummary.pendingAmount)}</Text>
              </View>
              {harvestBonusSummary.clearedAmount > 0 ? (
                <View style={styles.finalRow}>
                  <Text style={styles.finalRowLabel}>Already paid out</Text>
                  <Text style={styles.finalRowValue}>{inr(harvestBonusSummary.clearedAmount)}</Text>
                </View>
              ) : null}
              {harvestBonusSummary.pendingAmount > 0 ? (
                <View style={{ padding: spacing.md }}>
                  <Button
                    title={`Mark ${inr(harvestBonusSummary.pendingAmount)} bonus as paid`}
                    variant="secondary"
                    onPress={() => settleHarvestBonusMutation.mutate()}
                    loading={settleHarvestBonusMutation.isPending}
                  />
                </View>
              ) : null}
            </View>
          </Card>
        ) : null}

        {groupOpen && view === "final" && advances.length > 0 ? (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <Text style={styles.blockTitle}>ADVANCE PAYMENTS</Text>
            {advances.map((a, idx) => (
              <View key={a.id} style={[styles.simpleRow, idx > 0 && styles.periodRowBorder]}>
                <View>
                  <Text style={styles.simpleRowTitle}>{a.periodLabel || formatDate(a.paymentDate)}</Text>
                  <Text style={styles.simpleRowMeta}>{a.paymentDate}</Text>
                </View>
                <Text style={[styles.simpleRowValue, { color: colors.warning }]}>{inr(Number(a.totalAdvancePaid))}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {openFolder !== null && view === "final" && payments.length > 0 ? (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <Text style={styles.blockTitle}>PAYMENTS MADE</Text>
            {payments.map((pm, idx) => (
              <View key={pm.id} style={[styles.simpleRow, idx > 0 && styles.periodRowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.simpleRowTitle}>{pm.payeeName}</Text>
                  <Text style={styles.simpleRowMeta}>
                    {formatDate(pm.paymentDate)} · {pm.methodLabel || pm.method}{pm.note ? ` · ${pm.note}` : ""}
                  </Text>
                </View>
                <Text style={[styles.simpleRowValue, { color: "#1F9E92" }]}>{inr(Number(pm.amount))}</Text>
                <Pressable onPress={() => confirmDeletePayment(pm.id)} hitSlop={10} style={{ marginLeft: spacing.sm }}>
                  <Trash2 size={14} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </Card>
        ) : null}

        {folderRecords.length === 0 ? (
          <EmptyState
            title={allFolderRecords.length === 0 ? `No labour records for ${openFolder.name} yet` : "No work in these dates"}
            subtitle={allFolderRecords.length === 0 ? "Records will appear here after attendance is marked" : "Use ‹ › or tap the dates to see other weeks."}
          />
        ) : null}

        {sortedDates.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>DAILY RECORDS</Text>
          </>
        ) : null}

        {sortedDates.map((date) => {
          const entries = byDate[date];
          const totalWage = entries.reduce((s, e) => s + Number(e.wageAmount ?? 0), 0);
          return (
            <Card key={date} style={{ padding: 0, overflow: "hidden" }}>
              <View style={styles.dateHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Calendar size={14} color="#fff" />
                  <Text style={styles.dateHeaderText}>{formatDate(date)}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <Text style={styles.dateHeaderMeta}>{entries.length} worker{entries.length !== 1 ? "s" : ""}</Text>
                  {totalWage > 0 ? (
                    <View style={styles.dateHeaderBadge}>
                      <Text style={styles.dateHeaderBadgeText}>{inr(totalWage)}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {entries.map((entry, idx) => (
                <View key={entry.id} style={[styles.entryRow, idx > 0 && styles.periodRowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryName}>{entry.workerName}</Text>
                    {entry.workGroupName ? <Text style={styles.entryMeta}>{entry.workGroupName}</Text> : null}
                    {entry.notes ? <Text style={styles.entryNotes}>{entry.notes}</Text> : null}
                    {entry.createdAt ? <Text style={styles.entryRecordedAt}>Recorded {fmtRecordedAt(entry.createdAt)}</Text> : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    {entry.hoursWorked != null ? <Text style={styles.entryMeta}>{entry.hoursWorked}h</Text> : null}
                    {entry.overtimeHours ? <Text style={styles.entryMeta}>+{entry.overtimeHours}h OT</Text> : null}
                    {entry.harvestedKg ? <Text style={styles.entryMeta}>{entry.harvestedKg} kg</Text> : null}
                    {entry.wageAmount ? <Text style={styles.entryWage}>{inr(Number(entry.wageAmount))}</Text> : null}
                  </View>
                </View>
              ))}
            </Card>
          );
        })}
      </ScrollView>

      <PaySheet
        visible={showPaySheet}
        groupId={openFolder.id}
        groupName={openFolder.name}
        groupUpiId={group?.upiId}
        suggestedAmount={groupOpen && finalPayable > 0 ? finalPayable : undefined}
        onClose={() => setShowPaySheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.6, marginBottom: spacing.sm },
  folderRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  folderIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#9FD8EA", alignItems: "center", justifyContent: "center" },
  folderName: { fontSize: 16.5, fontWeight: "700", color: colors.text },
  folderSubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  countBadge: { backgroundColor: "#FFF0C2", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText: { fontSize: 14, fontWeight: "700", color: colors.primary },

  tabs: { flexDirection: "row", backgroundColor: colors.muted, borderRadius: radius.pill, padding: 4, gap: 2 },
  tab: { flex: 1, minHeight: 44, justifyContent: "center", borderRadius: radius.pill, alignItems: "center" },
  tabActive: { backgroundColor: "#fff", ...shadow },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: colors.text, fontWeight: "800" },

  payButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, backgroundColor: colors.primary, borderRadius: radius.pill, minHeight: 58 },
  payButtonText: { color: "#fff", fontWeight: "700", fontSize: 18 },

  finalHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  finalHeaderText: { color: "#fff", fontWeight: "700", fontSize: 14.5 },
  finalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.bg },
  finalRowLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  finalRowLabel: { fontSize: 14.5, color: colors.textMuted, flexShrink: 1 },
  finalRowValue: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  finalNote: { fontSize: 13, color: colors.textMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  finalTotal: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md },
  finalTotalLabel: { fontSize: 14.5, fontWeight: "600", flexShrink: 1 },
  finalTotalValue: { fontSize: 17, fontWeight: "700" },

  settleHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: "#B7791F", paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  settleHeaderText: { color: "#fff", fontWeight: "700", fontSize: 14.5 },
  settleBody: {},

  periodRow: { padding: spacing.md },
  periodRowBorder: { borderTopWidth: 1, borderTopColor: colors.bg },
  periodRowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  periodLabel: { fontSize: 15.5, fontWeight: "700", color: colors.text },
  periodValue: { fontSize: 15.5, fontWeight: "700" },
  periodMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 4 },
  periodMeta: { fontSize: 13, color: colors.textMuted },

  blockTitle: { fontSize: 13, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5, padding: spacing.md, paddingBottom: spacing.xs },
  blockTitleLight: { fontSize: 13, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5 },
  simpleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  simpleRowTitle: { fontSize: 14.5, fontWeight: "600", color: colors.text },
  simpleRowMutedLabel: { fontSize: 14.5, color: colors.textMuted },
  simpleRowMeta: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  simpleRowValue: { fontSize: 14.5, fontWeight: "700" },
  dayRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, gap: 3 },
  dayLine: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },

  // "Payment due now" card
  dueHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.bg },
  dueSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  dueHeaderValue: { fontSize: 18, fontWeight: "700", color: colors.primary },

  // Employees list
  employeeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4 },
  employeeAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFF0C2", alignItems: "center", justifyContent: "center" },
  employeeAvatarText: { fontSize: 15.5, fontWeight: "700", color: colors.primary },

  // Per-employee net-due summary card
  netDueCard: { alignItems: "center", padding: spacing.lg },
  netDuePositive: { backgroundColor: "#E3F4EA", borderColor: "#CDEBD8" },
  netDueNegative: { backgroundColor: "#FDEAEA", borderColor: "#F6D2D9" },
  netDueLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5, textTransform: "uppercase" },
  netDueValue: { fontSize: 34, fontWeight: "800", marginTop: 4 },
  netDueMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },

  // Account cleared (archival)
  clearedBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "#D8F3E6", borderWidth: 1, borderColor: "#B7E4CB", borderRadius: radius.md, padding: spacing.md },
  clearedBannerTitle: { fontSize: 15.5, fontWeight: "700", color: "#1F9E5C" },
  clearedBannerSubtitle: { fontSize: 14, color: "#1F9E5C", marginTop: 2 },
  clearButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, backgroundColor: colors.success, borderRadius: radius.pill, minHeight: 58 },
  clearButtonText: { color: "#fff", fontWeight: "700", fontSize: 15.5 },

  dateHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  dateHeaderText: { color: "#fff", fontWeight: "700", fontSize: 14.5 },
  dateHeaderMeta: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  dateHeaderBadge: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  dateHeaderBadgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  entryRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: spacing.md, gap: spacing.sm },
  entryName: { fontSize: 15.5, fontWeight: "600", color: colors.text },
  entryMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  entryNotes: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  entryRecordedAt: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  entryWage: { fontSize: 15.5, fontWeight: "700", color: colors.primary, marginTop: 2 },
});
