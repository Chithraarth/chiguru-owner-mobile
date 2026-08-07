import React, { useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useQuery } from "@tanstack/react-query";
import { Camera, ChevronDown, ChevronUp, X } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { ChipSelect } from "../../../components/ChipSelect";
import { SelectOrType } from "../../../components/SelectOrType";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { useLoans } from "../hooks/useLoans";
import { getGroupLoans } from "../../../api/endpoints/loans";
import { useWorkGroups } from "../../work-groups/hooks/useWorkGroups";
import { compressToDataUrl } from "../../../lib/imageCompression";
import { useT } from "../../../lib/i18n";
import type { Loan } from "../../../types/api";

const REPAYMENT_METHODS = ["salary deduction", "cash", "bank transfer", "installment"];

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function LoansScreen() {
  const { t } = useT();
  const { data: loans = [], isLoading, createLoan, deleteLoan, payLoan, workers } = useLoans();
  const { data: workGroups = [] } = useWorkGroups();
  const [openFolder, setOpenFolder] = useState<{ id: number | null; name: string } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);

  const [workerId, setWorkerId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [interestPct, setInterestPct] = useState("0");
  const [repayMethod, setRepayMethod] = useState(REPAYMENT_METHODS[0]);
  const [notes, setNotes] = useState("");
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [proofDataUrl, setProofDataUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState(REPAYMENT_METHODS[0]);

  const groupOpen = openFolder != null && openFolder.id != null;
  const { data: groupLoans = [] } = useQuery({
    queryKey: ["group-loans", openFolder?.id],
    queryFn: () => getGroupLoans(openFolder!.id as number),
    enabled: groupOpen,
  });

  if (isLoading) return <LoadingView label="Loading loans..." />;

  const knownGroupIds = new Set(workGroups.map((g) => g.id));
  const orphanIds = [...new Set(loans.filter((l) => l.workGroupId != null && !knownGroupIds.has(l.workGroupId)).map((l) => l.workGroupId as number))];
  const groupList = [...workGroups.map((g) => ({ id: g.id, name: g.name })), ...orphanIds.map((id) => ({ id, name: `Group #${id}` }))];
  const generalLoans = loans.filter((l) => l.workGroupId == null);

  function loansOfGroup(gid: number): Loan[] {
    if (openFolder?.id === gid && groupOpen) return groupLoans as unknown as Loan[];
    return loans.filter((l) => l.workGroupId === gid);
  }

  const folders = [
    ...groupList.map((g) => {
      const recs = loans.filter((l) => l.workGroupId === g.id);
      const outstanding = recs.filter((l) => l.status === "active").reduce((s, l) => s + Number(l.remainingAmount ?? l.totalDue), 0);
      return { id: g.id as number | null, name: g.name, subtitle: recs.length === 0 ? "No loans yet" : outstanding > 0 ? `${inr(outstanding)} outstanding` : "All repaid", count: recs.length };
    }),
    {
      id: null,
      name: "General Loans",
      subtitle: generalLoans.length === 0 ? "Loans without a group" : (() => {
        const out = generalLoans.filter((l) => l.status === "active").reduce((s, l) => s + Number(l.remainingAmount ?? l.totalDue), 0);
        return out > 0 ? `${inr(out)} outstanding` : "All repaid";
      })(),
      count: generalLoans.length,
    },
  ];

  const folderLoans: Loan[] = openFolder ? (openFolder.id != null ? loansOfGroup(openFolder.id) : generalLoans) : loans;
  const activeLoans = folderLoans.filter((l) => l.status === "active");
  const closedLoans = folderLoans.filter((l) => l.status !== "active");
  const totalPending = activeLoans.reduce((s, l) => s + Number(l.remainingAmount ?? l.totalDue), 0);
  const allOutstanding = loans.filter((l) => l.status === "active").reduce((s, l) => s + Number(l.remainingAmount ?? l.totalDue), 0);

  function workerName(l: Loan) {
    return l.workerName ?? workers.find((w) => w.id === l.workerId)?.name ?? `Worker #${l.workerId}`;
  }

  async function pickProof() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.75 });
    if (result.canceled || !result.assets?.[0]) return;
    setProofUri(result.assets[0].uri);
    setProofDataUrl(await compressToDataUrl(result.assets[0].uri, "record"));
  }

  function openLoanForm() {
    setWorkerId(workers[0]?.id ?? null);
    setAmount("");
    setInterestPct("0");
    setRepayMethod(REPAYMENT_METHODS[0]);
    setNotes("");
    setProofUri(null);
    setProofDataUrl(null);
    setFormError(null);
    setShowLoanForm(true);
  }

  function submitLoan() {
    setFormError(null);
    if (!workerId) { setFormError("Select a worker"); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { setFormError("Enter the loan amount"); return; }
    createLoan.mutate(
      {
        workerId,
        workGroupId: openFolder?.id ?? undefined,
        amount: amt,
        interestPct: Number(interestPct) || 0,
        issuedDate: todayIso(),
        repaymentMethod: repayMethod,
        notes: notes.trim() || undefined,
        proofPhotoUrl: proofDataUrl ?? undefined,
      },
      { onSuccess: () => setShowLoanForm(false) }
    );
  }

  function submitPayment() {
    if (!payingLoan) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return;
    payLoan.mutate(
      { loanId: payingLoan.id, data: { date: todayIso(), amount: amt, method: payMethod } },
      { onSuccess: () => setPayingLoan(null) }
    );
  }

  function confirmDelete(loan: Loan) {
    Alert.alert("Delete loan record?", undefined, [
      { text: t("scan.cancel"), style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteLoan.mutate(loan.id) },
    ]);
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        {openFolder === null ? (
          <>
            {allOutstanding > 0 ? (
              <View style={styles.outstandingCard}>
                <Text style={styles.outstandingLabel}>Total outstanding loans</Text>
                <Text style={styles.outstandingValue}>{inr(allOutstanding)}</Text>
              </View>
            ) : null}
            <Text style={styles.sectionLabel}>👥 YOUR WORK GROUPS</Text>
            <View style={{ gap: spacing.sm }}>
              {folders.map((f) => (
                <Pressable key={f.id ?? "general"} onPress={() => setOpenFolder({ id: f.id, name: f.name })}>
                  <Card style={styles.folderRow}>
                    <View style={styles.folderIcon}><Text style={{ fontSize: 20 }}>{f.id == null ? "💰" : "👥"}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.folderName}>{f.name}</Text>
                      <Text style={styles.folderSubtitle}>{f.subtitle}</Text>
                    </View>
                    {f.count > 0 ? <View style={styles.countBadge}><Text style={styles.countBadgeText}>{f.count}</Text></View> : null}
                  </Card>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Pressable onPress={() => setOpenFolder(null)}><Text style={styles.backLink}>← All Groups</Text></Pressable>

            {activeLoans.length > 0 ? (
              <View style={styles.outstandingCard}>
                <Text style={styles.outstandingLabel}>Outstanding for {openFolder.name}</Text>
                <Text style={styles.outstandingValue}>{inr(totalPending)}</Text>
              </View>
            ) : null}

            {folderLoans.length > 0 ? (
              <Button title="+ Record loan" onPress={openLoanForm} />
            ) : (
              <EmptyState title={`No loans for ${openFolder.name} yet`} actionLabel="Record loan" onAction={openLoanForm} />
            )}

            {activeLoans.length > 0 ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.sectionLabel}>ACTIVE LOANS</Text>
                {activeLoans.map((l) => {
                  const remaining = Number(l.remainingAmount ?? l.totalDue);
                  const pct = Math.min(100, (Number(l.repaidAmount) / Number(l.totalDue)) * 100);
                  return (
                    <Card key={l.id}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <View>
                          <Text style={styles.workerName}>{workerName(l)}</Text>
                          <Text style={styles.loanMeta}>Issued {l.issuedDate} · {l.repaymentMethod}</Text>
                          {l.workGroupName ? <Text style={styles.groupTag}>👥 {l.workGroupName}</Text> : null}
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.remainingLabel}>Remaining</Text>
                          <Text style={styles.remainingValue}>{inr(remaining)}</Text>
                        </View>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pct}%` }]} />
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={styles.progressText}>Repaid: {inr(Number(l.repaidAmount))}</Text>
                        <Text style={styles.progressText}>Total: {inr(Number(l.totalDue))}</Text>
                      </View>
                      {l.proofPhotoUrl ? (
                        <View style={styles.proofBadge}><Camera size={11} color={colors.primary} /><Text style={styles.proofBadgeText}>Proof photo saved</Text></View>
                      ) : null}
                      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                        <View style={{ flex: 1 }}>
                          <Button title="Record Payment" onPress={() => { setPayingLoan(l); setPayAmount(""); setPayMethod(REPAYMENT_METHODS[0]); }} />
                        </View>
                        <Pressable style={styles.expandBtn} onPress={() => setExpandedId(expandedId === l.id ? null : l.id)}>
                          {expandedId === l.id ? <ChevronUp size={16} color={colors.textMuted} /> : <ChevronDown size={16} color={colors.textMuted} />}
                        </Pressable>
                        <Pressable style={styles.expandBtn} onPress={() => confirmDelete(l)}>
                          <X size={16} color={colors.danger} />
                        </Pressable>
                      </View>
                      {expandedId === l.id && l.notes ? <Text style={styles.notesText}>{l.notes}</Text> : null}
                    </Card>
                  );
                })}
              </View>
            ) : null}

            {closedLoans.length > 0 ? (
              <View style={{ gap: spacing.xs }}>
                <Text style={styles.sectionLabel}>CLOSED LOANS</Text>
                {closedLoans.map((l) => (
                  <View key={l.id} style={styles.closedRow}>
                    <View>
                      <Text style={styles.closedName}>{workerName(l)}</Text>
                      <Text style={styles.closedMeta}>{l.issuedDate}{l.workGroupName ? ` · 👥 ${l.workGroupName}` : ""}</Text>
                    </View>
                    <View style={styles.closedBadge}><Text style={styles.closedBadgeText}>Closed</Text></View>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal visible={showLoanForm} transparent animationType="slide" onRequestClose={() => setShowLoanForm(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowLoanForm(false)} />
        <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: spacing.lg }}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>New Loan</Text>
              <Text style={styles.sheetSubtitle}>{openFolder?.id != null ? `👥 ${openFolder.name}` : "💰 General"}</Text>
            </View>
            <Pressable onPress={() => setShowLoanForm(false)} hitSlop={10}><X size={20} color={colors.textMuted} /></Pressable>
          </View>

          {workers.length > 0 ? (
            <ChipSelect label="Worker *" options={workers.map((w) => w.name)} value={workers.find((w) => w.id === workerId)?.name ?? ""} onChange={(name) => setWorkerId(workers.find((w) => w.name === name)?.id ?? null)} />
          ) : (
            <Text style={styles.errorText}>Add a worker first before issuing a loan.</Text>
          )}
          <TextField label="Amount (₹) *" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="5000" />
          <TextField label="Interest %" keyboardType="decimal-pad" value={interestPct} onChangeText={setInterestPct} />
          <SelectOrType label="Repayment method" options={REPAYMENT_METHODS} value={repayMethod} onChange={setRepayMethod} />
          <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Reason for loan (optional)" />

          <Text style={styles.label}>Proof of loan (photo)</Text>
          <Text style={styles.hint}>Take a photo while handing over the money — saved with date & time.</Text>
          {proofUri ? (
            <View style={{ alignSelf: "flex-start" }}>
              <Image source={{ uri: proofUri }} style={styles.proofPreview} />
              <Pressable style={styles.removeProofBtn} onPress={() => { setProofUri(null); setProofDataUrl(null); }}>
                <X size={13} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.proofPicker} onPress={pickProof}>
              <Camera size={18} color={colors.primary} />
              <Text style={styles.proofPickerText}>Take photo of handover</Text>
            </Pressable>
          )}

          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          <View style={{ marginTop: spacing.md }}>
            <Button title="Save Loan" onPress={submitLoan} loading={createLoan.isPending} disabled={workers.length === 0} />
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={!!payingLoan} transparent animationType="slide" onRequestClose={() => setPayingLoan(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPayingLoan(null)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Record Payment</Text>
            <Pressable onPress={() => setPayingLoan(null)} hitSlop={10}><X size={20} color={colors.textMuted} /></Pressable>
          </View>
          {payingLoan ? (
            <View style={styles.payingBox}>
              <Text style={styles.payingWorker}>{workerName(payingLoan)}</Text>
              <Text style={styles.payingOutstanding}>Outstanding: {inr(Number(payingLoan.remainingAmount ?? payingLoan.totalDue))}</Text>
            </View>
          ) : null}
          <TextField label="Amount (₹) *" keyboardType="decimal-pad" value={payAmount} onChangeText={setPayAmount} placeholder="1000" />
          <SelectOrType label="Payment method" options={REPAYMENT_METHODS} value={payMethod} onChange={setPayMethod} />
          <Button title="Record Payment" onPress={submitPayment} loading={payLoan.isPending} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  outstandingCard: { backgroundColor: "#FDEAEA", borderWidth: 1, borderColor: "#F5C6C6", borderRadius: radius.md, padding: spacing.md },
  outstandingLabel: { fontSize: 11.5, color: colors.danger, fontWeight: "600" },
  outstandingValue: { fontSize: 22, fontWeight: "700", color: colors.danger, marginTop: 2 },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5 },
  folderRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  folderIcon: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: "#FDEAEA", alignItems: "center", justifyContent: "center" },
  folderName: { fontSize: 15, fontWeight: "700", color: colors.text },
  folderSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  countBadge: { backgroundColor: "#E9E6FB", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText: { fontSize: 12, fontWeight: "700", color: colors.accent },
  backLink: { fontSize: 13, fontWeight: "700", color: colors.primary },

  workerName: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  loanMeta: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  groupTag: { fontSize: 11, color: "#3E6FB0", marginTop: 2 },
  remainingLabel: { fontSize: 10.5, color: colors.textMuted },
  remainingValue: { fontSize: 15, fontWeight: "700", color: colors.danger },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.muted, overflow: "hidden", marginTop: spacing.sm, marginBottom: 4 },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
  progressText: { fontSize: 10.5, color: colors.textMuted },
  proofBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.xs },
  proofBadgeText: { fontSize: 10.5, color: colors.primary, fontWeight: "600" },
  expandBtn: { width: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  notesText: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, fontStyle: "italic" },

  closedRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.muted, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, opacity: 0.7 },
  closedName: { fontSize: 13.5, fontWeight: "600", color: colors.text },
  closedMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  closedBadge: { backgroundColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  closedBadgeText: { fontSize: 10.5, fontWeight: "600", color: colors.text },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "88%", backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.md },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  sheetSubtitle: { fontSize: 12, color: "#3E6FB0", fontWeight: "600", marginTop: 2 },

  label: { fontSize: 14, fontWeight: "500", color: colors.text, marginBottom: 2 },
  hint: { fontSize: 11, color: colors.textMuted, marginBottom: spacing.sm },
  proofPreview: { width: 90, height: 90, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  removeProofBtn: { position: "absolute", top: -6, right: -6, backgroundColor: colors.danger, borderRadius: 12, padding: 4 },
  proofPicker: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderWidth: 2, borderStyle: "dashed", borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md },
  proofPickerText: { fontSize: 13, color: colors.textMuted },
  errorText: { color: colors.danger, fontSize: 12.5, marginBottom: spacing.md },

  payingBox: { backgroundColor: "#FDEAEA", borderRadius: radius.sm, padding: spacing.sm + 4, marginBottom: spacing.md },
  payingWorker: { fontSize: 13.5, fontWeight: "600", color: colors.danger },
  payingOutstanding: { fontSize: 12.5, color: colors.danger, marginTop: 2 },
});
