import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, X } from "lucide-react-native";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { colors, radius, spacing } from "../../../components/theme";
import { getWorkerWages, getWorkers } from "../../../api/endpoints/attendance";
import { createWorkerPayment } from "../../../api/endpoints/workerPayments";
import { newClientId } from "../../../lib/idempotency";

function currentMonth(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface PayMethod {
  id: "cash" | "upi" | "bank" | "wallet" | "other";
  label: string;
  emoji: string;
  handlePlaceholder?: string;
  hint?: string;
}

// India-only method set (the app has no country picker yet, unlike the web
// app's payMethodsForCountry) - matches the market this mobile app targets.
const METHODS: PayMethod[] = [
  { id: "upi", label: "UPI (PhonePe / Google Pay / Paytm)", emoji: "📱", handlePlaceholder: "UPI ID e.g. name@ybl", hint: "Opens your own UPI app with amount filled — you confirm with your PIN" },
  { id: "cash", label: "Cash", emoji: "💵", hint: "Hand over cash and record it here" },
  { id: "bank", label: "Bank transfer", emoji: "🏦", handlePlaceholder: "Account / reference (optional)", hint: "Pay from your bank app, then record here" },
  { id: "other", label: "Other", emoji: "📝", hint: "Any other way — record it here" },
];

function looksLikeUpiId(v: string): boolean {
  return /^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(v.trim());
}

function buildUpiLink(payeeHandle: string, payeeName: string, amount: number, note?: string): string {
  const params = new URLSearchParams({
    pa: payeeHandle.trim(),
    pn: payeeName.trim() || "Worker",
    am: amount > 0 ? amount.toFixed(2) : "",
    cu: "INR",
    tn: note || "Farm wage payment",
  });
  return `upi://pay?${params.toString()}`;
}

export function PaySheet({
  visible,
  groupId,
  groupName,
  groupUpiId,
  suggestedAmount,
  initialWorkerId,
  onClose,
}: {
  visible: boolean;
  groupId: number | null;
  groupName: string;
  groupUpiId?: string | null;
  suggestedAmount?: number;
  /** Pre-select "one worker" and lock the payee to this worker (per-employee drill-down). */
  initialWorkerId?: number | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: workers = [] } = useQuery({
    queryKey: ["workers"],
    queryFn: getWorkers,
    enabled: visible,
  });

  const [payeeKind, setPayeeKind] = useState<"group" | "worker">(
    initialWorkerId != null ? "worker" : groupId != null ? "group" : "worker",
  );
  const [workerId, setWorkerId] = useState<number | null>(initialWorkerId ?? null);
  const [wagesMonth, setWagesMonth] = useState(currentMonth());
  const [method, setMethod] = useState<PayMethod>(METHODS[0]);
  const [amount, setAmount] = useState("");
  const [handle, setHandle] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [upiOpened, setUpiOpened] = useState(false);
  const [clientId] = useState(() => newClientId());

  useEffect(() => {
    if (visible) {
      setPayeeKind(initialWorkerId != null ? "worker" : groupId != null ? "group" : "worker");
      setWorkerId(initialWorkerId ?? null);
      setWagesMonth(currentMonth());
      setMethod(METHODS[0]);
      setAmount(suggestedAmount && suggestedAmount > 0 ? String(Math.round(suggestedAmount)) : "");
      setHandle(initialWorkerId == null && groupId != null ? groupUpiId ?? "" : "");
      setNote("");
      setUpiOpened(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const selectedWorker = workers.find((w) => w.id === workerId);
  const payeeName = payeeKind === "group" ? groupName : selectedWorker?.name ?? "";

  const wagesQuery = useQuery({
    queryKey: ["worker-wages", workerId, wagesMonth],
    queryFn: () => getWorkerWages(workerId as number, wagesMonth),
    enabled: visible && payeeKind === "worker" && workerId != null,
  });
  const wages = useMemo(() => wagesQuery.data, [wagesQuery.data]);

  const amt = parseFloat(amount);
  const amountOk = Number.isFinite(amt) && amt > 0;
  const needsWorker = payeeKind === "worker" && !selectedWorker;
  const upiHandleOk = method.id !== "upi" || looksLikeUpiId(handle);
  const canSave = amountOk && !needsWorker && payeeName.trim().length > 0 && upiHandleOk;

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const saved = await createWorkerPayment({
        workGroupId: groupId,
        workerId: payeeKind === "worker" ? workerId : null,
        payeeName,
        amount: amt,
        method: method.id,
        methodLabel: method.label,
        payeeHandle: handle.trim() || null,
        paymentDate: new Date().toISOString().slice(0, 10),
        note: note.trim() || null,
        clientId,
      });
      qc.invalidateQueries({ queryKey: ["worker-payments"] });
      qc.invalidateQueries({ queryKey: ["workers"] });
      qc.invalidateQueries({ queryKey: ["work-groups"] });
      onClose();
      // apiMutate returns null when the write was queued offline instead of
      // reaching the server immediately - tell the owner which one happened.
      Alert.alert(saved ? "Payment recorded" : "Saved offline", saved ? undefined : "It'll sync once you're back online.");
    } finally {
      setSaving(false);
    }
  }

  async function openUpi() {
    if (!amountOk || !looksLikeUpiId(handle)) return;
    const url = buildUpiLink(handle, payeeName, amt, note);
    setUpiOpened(true);
    try {
      await Linking.openURL(url);
    } catch {
      // No UPI app installed on this device — the "Mark as paid & save"
      // button still lets the owner record the payment manually.
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{initialWorkerId != null ? `Pay ${payeeName || "Worker"}` : "Pay Workers"}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          {initialWorkerId == null ? (
            <>
              <Text style={styles.label}>Pay to</Text>
              <View style={styles.row}>
                {groupId != null ? (
                  <Pressable
                    style={[styles.payeeOption, payeeKind === "group" && styles.payeeOptionActive]}
                    onPress={() => setPayeeKind("group")}
                  >
                    <Text style={[styles.payeeOptionTitle, payeeKind === "group" && styles.payeeOptionTitleActive]}>
                      👥 Whole group
                    </Text>
                    <Text style={[styles.payeeOptionSub, payeeKind === "group" && styles.payeeOptionSubActive]} numberOfLines={1}>
                      {groupName}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.payeeOption, payeeKind === "worker" && styles.payeeOptionActive]}
                  onPress={() => setPayeeKind("worker")}
                >
                  <Text style={[styles.payeeOptionTitle, payeeKind === "worker" && styles.payeeOptionTitleActive]}>
                    🧑‍🌾 One worker
                  </Text>
                  <Text style={[styles.payeeOptionSub, payeeKind === "worker" && styles.payeeOptionSubActive]}>
                    Pick by name
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {payeeKind === "worker" && initialWorkerId == null ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                {workers.map((w) => (
                  <Pressable
                    key={w.id}
                    onPress={() => setWorkerId(w.id)}
                    style={[styles.workerChip, workerId === w.id && styles.workerChipActive]}
                  >
                    <Text style={[styles.workerChipText, workerId === w.id && styles.workerChipTextActive]}>{w.name}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : null}

          {payeeKind === "worker" && selectedWorker ? (
            <View style={styles.wagesBox}>
              <View style={styles.wagesHeader}>
                <Text style={styles.wagesTitle}>Wages — {wagesMonth === currentMonth() ? "This month" : "Last month"}</Text>
                <View style={{ flexDirection: "row", gap: spacing.xs }}>
                  <Pressable
                    style={[styles.monthToggle, wagesMonth === currentMonth(-1) && styles.monthToggleActive]}
                    onPress={() => setWagesMonth(currentMonth(-1))}
                  >
                    <Text style={[styles.monthToggleText, wagesMonth === currentMonth(-1) && styles.monthToggleTextActive]}>Last</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.monthToggle, wagesMonth === currentMonth() && styles.monthToggleActive]}
                    onPress={() => setWagesMonth(currentMonth())}
                  >
                    <Text style={[styles.monthToggleText, wagesMonth === currentMonth() && styles.monthToggleTextActive]}>This</Text>
                  </Pressable>
                </View>
              </View>
              {wagesQuery.isLoading ? (
                <Text style={styles.wagesRow}>Loading…</Text>
              ) : wages ? (
                <>
                  <View style={styles.wagesRowLine}>
                    <Text style={styles.wagesRow}>{wages.totalDays} days · {wages.totalHours.toFixed(1)} hrs</Text>
                    <Text style={styles.wagesRow}>Earned ₹{wages.totalWage.toFixed(0)}</Text>
                  </View>
                  {wages.loanDeductions > 0 ? (
                    <View style={styles.wagesRowLine}>
                      <Text style={styles.wagesRowMuted}>Loan deduction</Text>
                      <Text style={styles.wagesRowMuted}>-₹{wages.loanDeductions.toFixed(0)}</Text>
                    </View>
                  ) : null}
                  <View style={styles.wagesRowLine}>
                    <Text style={styles.wagesNetLabel}>Net payable</Text>
                    <Text style={styles.wagesNetValue}>₹{wages.netPayable.toFixed(0)}</Text>
                  </View>
                  {wages.pendingLoanBalance > 0 ? (
                    <Text style={styles.wagesRowMuted}>Outstanding loan balance: ₹{wages.pendingLoanBalance.toFixed(0)}</Text>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}

          <TextField
            label="Amount *"
            keyboardType="decimal-pad"
            placeholder="e.g. 2500"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={styles.label}>How are you paying?</Text>
          <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
            {METHODS.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => { setMethod(m); setUpiOpened(false); }}
                style={[styles.methodRow, method.id === m.id && styles.methodRowActive]}
              >
                <Text style={styles.methodEmoji}>{m.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodLabel}>{m.label}</Text>
                  {m.hint ? <Text style={styles.methodHint}>{m.hint}</Text> : null}
                </View>
                {method.id === m.id ? <CheckCircle2 size={18} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </View>

          {method.id !== "cash" && method.handlePlaceholder ? (
            <TextField
              label={method.id === "upi" ? "Worker's UPI ID *" : "Payee details"}
              placeholder={method.handlePlaceholder}
              value={handle}
              onChangeText={(v) => { setHandle(v); setUpiOpened(false); }}
              autoCapitalize="none"
            />
          ) : null}
          {method.id === "upi" && handle.trim() !== "" && !looksLikeUpiId(handle) ? (
            <Text style={styles.warning}>A UPI ID looks like name@ybl or 9876543210@upi</Text>
          ) : null}

          {method.id === "upi" ? (
            <View style={styles.upiBox}>
              <Text style={styles.upiBoxText}>
                This opens your own UPI app (PhonePe, Google Pay, Paytm…) with the payee and amount filled in. You check
                everything and confirm with your PIN — Chiguru never touches your money.
              </Text>
              <Pressable
                style={[styles.upiButton, (!amountOk || !looksLikeUpiId(handle)) && styles.upiButtonDisabled]}
                onPress={openUpi}
              >
                <ExternalLink size={15} color="#fff" />
                <Text style={styles.upiButtonText}>Open UPI app to pay {amountOk ? `₹${amt}` : ""}</Text>
              </Pressable>
              {upiOpened ? (
                <Text style={styles.upiOpenedNote}>After paying in your UPI app, come back and tap "Mark as paid" below.</Text>
              ) : null}
            </View>
          ) : null}

          <TextField label="Note" placeholder="e.g. Week of 13 Jul, harvest wages" value={note} onChangeText={setNote} />

          <Button
            title={method.id === "cash" ? "Record cash payment" : method.id === "upi" ? "Mark as paid & save" : "Record payment"}
            onPress={save}
            loading={saving}
            disabled={!canSave}
          />
          <Text style={styles.footerNote}>
            Chiguru keeps your payment record safe on the farm ledger. Money always moves only through your own bank / payment
            app.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "88%",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  label: { fontSize: 14, fontWeight: "500", color: colors.text, marginBottom: spacing.xs },
  row: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  payeeOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm + 4,
  },
  payeeOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  payeeOptionTitle: { fontSize: 13, fontWeight: "600", color: colors.text },
  payeeOptionTitleActive: { color: "#fff" },
  payeeOptionSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  payeeOptionSubActive: { color: "rgba(255,255,255,0.8)" },
  workerChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
  },
  workerChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  workerChipText: { fontSize: 13, color: colors.text },
  workerChipTextActive: { color: "#fff", fontWeight: "600" },
  methodRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm + 4,
  },
  methodRowActive: { borderColor: colors.primary, backgroundColor: colors.bg },
  methodEmoji: { fontSize: 18, lineHeight: 22 },
  methodLabel: { fontSize: 14, fontWeight: "500", color: colors.text },
  methodHint: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  warning: { fontSize: 12, color: colors.warning, marginTop: -spacing.sm, marginBottom: spacing.md },
  upiBox: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  upiBoxText: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  upiButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
  },
  upiButtonDisabled: { opacity: 0.5 },
  upiButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  upiOpenedNote: { fontSize: 12, color: colors.primary, fontWeight: "500" },
  footerNote: { fontSize: 11, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm, lineHeight: 15 },
  wagesBox: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm + 4,
    marginBottom: spacing.md,
    gap: 4,
  },
  wagesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  wagesTitle: { fontSize: 12.5, fontWeight: "700", color: colors.text },
  monthToggle: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  monthToggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthToggleText: { fontSize: 11, color: colors.text, fontWeight: "600" },
  monthToggleTextActive: { color: "#fff" },
  wagesRowLine: { flexDirection: "row", justifyContent: "space-between" },
  wagesRow: { fontSize: 12.5, color: colors.text },
  wagesRowMuted: { fontSize: 11.5, color: colors.textMuted },
  wagesNetLabel: { fontSize: 13, fontWeight: "700", color: colors.text },
  wagesNetValue: { fontSize: 13, fontWeight: "700", color: colors.primary },
});
