import React, { useLayoutEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Banknote, Calendar, Clock3, CreditCard, Scale, Send, Trash2, Wheat } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { LoadingView, EmptyState } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { getAllAttendance, getAdvancePayments } from "../../../api/endpoints/attendance";
import {
  getHarvestBonusSummary,
  getOvertimeSummary,
  getWorkGroups,
  settleHarvestBonus,
  settleOvertime,
} from "../../../api/endpoints/workGroups";
import { getGroupLoans } from "../../../api/endpoints/loans";
import { getWorkerPayments, deleteWorkerPayment } from "../../../api/endpoints/workerPayments";
import { PaySheet } from "../components/PaySheet";
import { newClientId } from "../../../lib/idempotency";
import { useT } from "../../../lib/i18n";
import type { AttendanceRecord } from "../../../types/api";

type ViewMode = "weekly" | "monthly" | "yearly" | "final";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", weekday: "short",
  });
}
function fmtRecordedAt(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function weekStart(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function weekLabel(startStr: string) {
  const s = new Date(startStr + "T00:00:00");
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${s.toLocaleDateString("en-IN", opts)} – ${e.toLocaleDateString("en-IN", opts)}`;
}
function monthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}
function monthLabel(key: string) {
  return new Date(key + "-01T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
function yearKey(dateStr: string) {
  return dateStr.slice(0, 4);
}

interface PeriodTotals { days: number; wages: number; advances: number; loans: number }

export function LabourRecordsScreen({ navigation }: { navigation: any }) {
  const [openFolder, setOpenFolder] = useState<{ id: number | null; name: string } | null>(null);
  const [view, setView] = useState<ViewMode>("weekly");
  const [showPaySheet, setShowPaySheet] = useState(false);
  const qc = useQueryClient();
  const { t } = useT();

  // Mirrors the web app's PageShell: title + back button swap to "close this
  // folder" instead of leaving the screen, while a folder is open.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: openFolder ? openFolder.name : t("farmAcct.labour"),
      headerLeft: openFolder
        ? () => (
            <Pressable onPress={() => setOpenFolder(null)} hitSlop={10} style={{ marginLeft: spacing.sm }}>
              <ArrowLeft size={22} color={colors.text} />
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, openFolder]);

  const { data: records = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance-all"],
    queryFn: getAllAttendance,
  });
  const { data: workGroups = [] } = useQuery({ queryKey: ["work-groups"], queryFn: getWorkGroups });

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
    enabled: openFolder != null,
  });
  const payments = openFolder != null ? allPayments.filter((pm) => (pm.workGroupId ?? null) === openFolder.id) : [];
  const paymentsTotal = payments.reduce((s, pm) => s + Number(pm.amount), 0);

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

  // Folders: one per active work group (+ orphaned group ids referenced by
  // records), plus "General Records" for entries with no group.
  const knownGroupIds = new Set(workGroups.map((g) => g.id));
  const orphanIds = [...new Set(records.filter((r) => r.workGroupId != null && !knownGroupIds.has(r.workGroupId)).map((r) => r.workGroupId as number))];
  const groupList = [
    ...workGroups.map((g) => ({ id: g.id, name: g.name })),
    ...orphanIds.map((id) => ({ id, name: records.find((r) => r.workGroupId === id)?.workGroupName ?? `Group #${id}` })),
  ];
  const generalRecords = records.filter((r) => r.workGroupId == null);

  const folders = [
    ...groupList.map((g) => {
      const recs = records.filter((r) => r.workGroupId === g.id);
      const wage = recs.reduce((s, r) => s + Number(r.wageAmount ?? 0), 0);
      return { id: g.id as number | null, name: g.name, subtitle: recs.length === 0 ? "No records yet" : wage > 0 ? `${inr(wage)} wages` : `${recs.length} entries`, count: recs.length };
    }),
    {
      id: null,
      name: "General Records",
      subtitle: generalRecords.length === 0
        ? "Records without a group"
        : (() => { const wage = generalRecords.reduce((s, r) => s + Number(r.wageAmount ?? 0), 0); return wage > 0 ? `${inr(wage)} wages` : `${generalRecords.length} entries`; })(),
      count: generalRecords.length,
    },
  ];

  const folderRecords = openFolder ? records.filter((r) => (r.workGroupId ?? null) === openFolder.id) : records;

  const group = groupOpen ? workGroups.find((g) => g.id === openFolder!.id) : undefined;
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

  const emptyPeriod = (): PeriodTotals => ({ days: 0, wages: 0, advances: 0, loans: 0 });
  const weekly = new Map<string, PeriodTotals>();
  const monthly = new Map<string, PeriodTotals>();
  const yearly = new Map<string, PeriodTotals>();
  const bump = (map: Map<string, PeriodTotals>, key: string, fn: (t: PeriodTotals) => void) => {
    const t = map.get(key) ?? emptyPeriod();
    fn(t);
    map.set(key, t);
  };
  for (const r of folderRecords) {
    const add = (t: PeriodTotals) => { t.days += 1; t.wages += earnOf(r); };
    bump(weekly, weekStart(r.date), add);
    bump(monthly, monthKey(r.date), add);
    bump(yearly, yearKey(r.date), add);
  }
  for (const a of advances) {
    const add = (t: PeriodTotals) => { t.advances += Number(a.totalAdvancePaid); };
    bump(weekly, weekStart(a.paymentDate), add);
    bump(monthly, monthKey(a.paymentDate), add);
    bump(yearly, yearKey(a.paymentDate), add);
  }
  for (const l of groupLoans) {
    if (!l.issuedDate) continue;
    const add = (t: PeriodTotals) => { t.loans += Number(l.amount); };
    bump(weekly, weekStart(l.issuedDate), add);
    bump(monthly, monthKey(l.issuedDate), add);
    bump(yearly, yearKey(l.issuedDate), add);
  }
  const weeklyRows = [...weekly.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const monthlyRows = [...monthly.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const yearlyRows = [...yearly.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  const byDate = folderRecords.reduce<Record<string, AttendanceRecord[]>>((acc, r) => {
    (acc[r.date] = acc[r.date] || []).push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  if (openFolder === null) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
        <Text style={styles.sectionLabel}>👥 YOUR WORK GROUPS</Text>
        <View style={{ gap: spacing.sm }}>
          {folders.map((f) => (
            <Pressable key={f.id ?? "general"} onPress={() => { setView("weekly"); setOpenFolder({ id: f.id, name: f.name }); }}>
              <Card style={styles.folderRow}>
                <View style={styles.folderIcon}>
                  <Text style={{ fontSize: 20 }}>{f.id == null ? "📋" : "👥"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.folderName}>{f.name}</Text>
                  <Text style={styles.folderSubtitle}>{f.subtitle}</Text>
                </View>
                {f.count > 0 ? (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{f.count}</Text>
                  </View>
                ) : null}
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        {groupOpen ? (
          <View style={styles.tabs}>
            {([["weekly", "Weekly"], ["monthly", "Monthly"], ["yearly", "Yearly"], ["final", "Final Account"]] as [ViewMode, string][]).map(([key, label]) => (
              <Pressable key={key} onPress={() => setView(key)} style={[styles.tab, view === key && styles.tabActive]}>
                <Text style={[styles.tabText, view === key && styles.tabTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Pressable style={styles.payButton} onPress={() => setShowPaySheet(true)}>
          <Send size={16} color="#fff" />
          <Text style={styles.payButtonText}>Pay Workers</Text>
        </Pressable>

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

        {groupOpen && view !== "final" ? (() => {
          const rows = view === "weekly" ? weeklyRows : view === "monthly" ? monthlyRows : yearlyRows;
          const labelOf = (key: string) => (view === "weekly" ? weekLabel(key) : view === "monthly" ? monthLabel(key) : key);
          if (rows.length === 0) {
            return <EmptyState title="No records yet for this view" />;
          }
          return (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {rows.map(([key, v], idx) => {
                const advanceDue = v.days * advPerDay;
                const held = v.wages - advanceDue;
                const toPay = hasAdvanceStructure ? advanceDue : v.wages - v.advances;
                return (
                  <View key={key} style={[styles.periodRow, idx > 0 && styles.periodRowBorder]}>
                    <View style={styles.periodRowTop}>
                      <Text style={styles.periodLabel}>{labelOf(key)}</Text>
                      <Text style={[styles.periodValue, { color: toPay >= 0 ? colors.primary : colors.danger }]}>
                        {toPay >= 0 ? inr(toPay) : `− ${inr(Math.abs(toPay))}`}
                      </Text>
                    </View>
                    <View style={styles.periodMetaRow}>
                      <Text style={styles.periodMeta}>{v.days} work{v.days !== 1 ? "s" : ""} done</Text>
                      <Text style={[styles.periodMeta, { color: colors.primary }]}>earned {inr(v.wages)}</Text>
                      {hasAdvanceStructure ? (
                        held > 0 ? <Text style={[styles.periodMeta, { color: colors.warning }]}>{inr(held)} held for final</Text> : null
                      ) : v.advances > 0 ? (
                        <Text style={[styles.periodMeta, { color: colors.warning }]}>advance − {inr(v.advances)}</Text>
                      ) : null}
                      {v.loans > 0 ? <Text style={[styles.periodMeta, { color: colors.danger }]}>loan given {inr(v.loans)}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </Card>
          );
        })() : null}

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
          <EmptyState title={`No labour records for ${openFolder.name} yet`} subtitle="Records will appear here after attendance is marked" />
        ) : null}

        {(!groupOpen || view === "final") && sortedDates.length > 0 ? (
          <Text style={styles.sectionLabel}>DAILY RECORDS</Text>
        ) : null}

        {(!groupOpen || view === "final") && sortedDates.map((date) => {
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
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.6, marginBottom: spacing.sm },
  folderRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  folderIcon: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: "#E4EEFB", alignItems: "center", justifyContent: "center" },
  folderName: { fontSize: 15, fontWeight: "700", color: colors.text },
  folderSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  countBadge: { backgroundColor: "#E9E6FB", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText: { fontSize: 12, fontWeight: "700", color: colors.accent },

  tabs: { flexDirection: "row", backgroundColor: colors.muted, borderRadius: radius.sm, padding: 4, gap: 2 },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm - 2, alignItems: "center" },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: colors.primary },

  payButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md },
  payButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  finalHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  finalHeaderText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  finalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.bg },
  finalRowLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  finalRowLabel: { fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  finalRowValue: { fontSize: 13, fontWeight: "700", color: colors.text },
  finalNote: { fontSize: 11, color: colors.textMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  finalTotal: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md },
  finalTotalLabel: { fontSize: 13, fontWeight: "600", flexShrink: 1 },
  finalTotalValue: { fontSize: 16, fontWeight: "700" },

  settleHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: "#B7791F", paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  settleHeaderText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  settleBody: {},

  periodRow: { padding: spacing.md },
  periodRowBorder: { borderTopWidth: 1, borderTopColor: colors.bg },
  periodRowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  periodLabel: { fontSize: 14, fontWeight: "700", color: colors.text },
  periodValue: { fontSize: 14, fontWeight: "700" },
  periodMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 4 },
  periodMeta: { fontSize: 11, color: colors.textMuted },

  blockTitle: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5, padding: spacing.md, paddingBottom: spacing.xs },
  simpleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  simpleRowTitle: { fontSize: 13, fontWeight: "600", color: colors.text },
  simpleRowMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  simpleRowValue: { fontSize: 13, fontWeight: "700" },

  dateHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  dateHeaderText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  dateHeaderMeta: { color: "rgba(255,255,255,0.8)", fontSize: 11 },
  dateHeaderBadge: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  dateHeaderBadgeText: { color: "#fff", fontWeight: "700", fontSize: 11 },
  entryRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: spacing.md, gap: spacing.sm },
  entryName: { fontSize: 14, fontWeight: "600", color: colors.text },
  entryMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  entryNotes: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  entryRecordedAt: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  entryWage: { fontSize: 14, fontWeight: "700", color: colors.primary, marginTop: 2 },
});
