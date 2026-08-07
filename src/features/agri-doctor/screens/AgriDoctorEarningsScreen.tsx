import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Banknote, CheckCircle2, ChevronRight, Clock, Landmark } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { getAgronomists } from "../../../api/endpoints/agriDoctor";
import { getAgronomistEarnings, markPayoutPaid, requestPayout } from "../../../api/endpoints/agriDoctor";

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function AgriDoctorEarningsScreen() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const qc = useQueryClient();

  const doctorsQuery = useQuery({ queryKey: ["agronomists"], queryFn: getAgronomists });
  const earningsQuery = useQuery({
    queryKey: ["agronomist-earnings", selectedId],
    queryFn: () => getAgronomistEarnings(selectedId!),
    enabled: selectedId != null,
  });

  const requestMutation = useMutation({
    mutationFn: (amt: number) => requestPayout(selectedId!, amt),
    onSuccess: () => {
      setAmount("");
      qc.invalidateQueries({ queryKey: ["agronomist-earnings", selectedId] });
      Alert.alert("Payout requested", "It will move to your account once processed.");
    },
    onError: (err) => Alert.alert("Could not request payout", err instanceof Error ? err.message : undefined),
  });

  const markPaidMutation = useMutation({
    mutationFn: (payoutId: number) => markPayoutPaid(selectedId!, payoutId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agronomist-earnings", selectedId] });
      Alert.alert("Marked as paid");
    },
  });

  if (selectedId == null) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
        <Text style={styles.intro}>Select your doctor profile to see your consultation earnings and request a payout.</Text>
        {(doctorsQuery.data ?? []).map((d) => (
          <Pressable key={d.id} onPress={() => setSelectedId(d.id)}>
            <Card style={styles.doctorRow}>
              <View style={styles.emojiWrap}><Text style={{ fontSize: 22 }}>{d.emoji ?? "🌾"}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.doctorName} numberOfLines={1}>{d.name}</Text>
                <Text style={styles.doctorSpeciality} numberOfLines={1}>{d.speciality}</Text>
              </View>
              <ChevronRight size={16} color={colors.border} />
            </Card>
          </Pressable>
        ))}
        {(doctorsQuery.data ?? []).length === 0 ? <Text style={styles.emptyText}>No doctor profiles yet.</Text> : null}
      </ScrollView>
    );
  }

  const earnings = earningsQuery.data;
  const pm = earnings?.payoutMethod;
  const amt = Number(amount);
  const canRequest = amt > 0 && earnings != null && amt <= earnings.available && earnings.payoutReady;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Pressable onPress={() => setSelectedId(null)}>
        <Text style={styles.backLink}>← All doctors</Text>
      </Pressable>

      {earningsQuery.isLoading || !earnings ? (
        <LoadingView label="Loading earnings..." />
      ) : (
        <>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available to withdraw</Text>
            <Text style={styles.balanceValue}>{inr(earnings.available)}</Text>
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Total earned</Text>
                <Text style={styles.balanceStatValue}>{inr(earnings.totalEarnings)}</Text>
              </View>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Paid out</Text>
                <Text style={styles.balanceStatValue}>{inr(earnings.paidOut)}</Text>
              </View>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Pending</Text>
                <Text style={styles.balanceStatValue}>{inr(earnings.pending)}</Text>
              </View>
            </View>
          </View>

          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm }}>
              <Landmark size={15} color={colors.primary} />
              <Text style={styles.blockTitle}>Payout method</Text>
            </View>
            {earnings.payoutReady && pm ? (
              <View style={{ gap: 4 }}>
                {pm.accountHolderName ? <View style={styles.pmRow}><Text style={styles.pmLabel}>Holder</Text><Text style={styles.pmValue}>{pm.accountHolderName}</Text></View> : null}
                {pm.bankAccountNumber ? <View style={styles.pmRow}><Text style={styles.pmLabel}>Account</Text><Text style={styles.pmValue}>{pm.bankAccountNumber}</Text></View> : null}
                {pm.ifscCode ? <View style={styles.pmRow}><Text style={styles.pmLabel}>IFSC</Text><Text style={styles.pmValue}>{pm.ifscCode}</Text></View> : null}
                {pm.upiId ? <View style={styles.pmRow}><Text style={styles.pmLabel}>UPI</Text><Text style={styles.pmValue}>{pm.upiId}</Text></View> : null}
                {pm.panNumber ? <View style={styles.pmRow}><Text style={styles.pmLabel}>PAN</Text><Text style={styles.pmValue}>{pm.panNumber}</Text></View> : null}
              </View>
            ) : (
              <View style={styles.warningBox}>
                <AlertTriangle size={14} color="#C77A2E" />
                <Text style={styles.warningText}>No payout details on file. Edit this profile to add a bank account or UPI ID before withdrawing.</Text>
              </View>
            )}
          </Card>

          <Card>
            <Text style={styles.blockTitle}>Request a payout</Text>
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, alignItems: "flex-end" }}>
              <View style={{ flex: 1 }}>
                <TextField
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder={`Max ${inr(earnings.available)}`}
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
              <Pressable
                style={[styles.requestBtn, (!canRequest || requestMutation.isPending) && { opacity: 0.5 }]}
                disabled={!canRequest || requestMutation.isPending}
                onPress={() => requestMutation.mutate(amt)}
              >
                <Text style={styles.requestBtnText}>Request</Text>
              </Pressable>
            </View>
            {amount !== "" && amt > earnings.available ? <Text style={styles.errorText}>Amount can't be more than your available balance.</Text> : null}
          </Card>

          <View>
            <Text style={styles.sectionLabel}>PAYOUT HISTORY</Text>
            {earnings.payouts.length === 0 ? (
              <Text style={styles.emptyText}>No payouts yet.</Text>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {earnings.payouts.map((p) => (
                  <Card key={p.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                      {p.status === "paid" ? <CheckCircle2 size={16} color={colors.primary} /> : <Clock size={16} color="#D9A441" />}
                      <View>
                        <Text style={styles.payoutAmount}>{inr(Number(p.amount))}</Text>
                        <Text style={styles.payoutMeta}>
                          {new Date(p.createdAt).toLocaleDateString("en-IN")} · {p.method.toUpperCase()}{p.reference ? ` · ${p.reference}` : ""}
                        </Text>
                      </View>
                    </View>
                    {p.status === "paid" ? (
                      <View style={styles.paidBadge}><Text style={styles.paidBadgeText}>Paid</Text></View>
                    ) : (
                      <Pressable style={styles.markPaidBtn} onPress={() => markPaidMutation.mutate(p.id)} disabled={markPaidMutation.isPending}>
                        <Text style={styles.markPaidText}>Mark paid</Text>
                      </Pressable>
                    )}
                  </Card>
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  intro: { fontSize: 12.5, color: colors.textMuted, lineHeight: 17 },
  doctorRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  emojiWrap: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  doctorName: { fontSize: 14, fontWeight: "700", color: colors.text },
  doctorSpeciality: { fontSize: 11.5, color: colors.primary },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: "center", paddingVertical: spacing.lg },
  backLink: { fontSize: 13, fontWeight: "700", color: colors.primary },

  balanceCard: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg },
  balanceLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11.5 },
  balanceValue: { color: "#fff", fontSize: 28, fontWeight: "700", marginTop: 2 },
  balanceStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: radius.sm, paddingVertical: spacing.sm, alignItems: "center" },
  balanceStatLabel: { color: "rgba(255,255,255,0.8)", fontSize: 10 },
  balanceStatValue: { color: "#fff", fontSize: 13, fontWeight: "700", marginTop: 2 },

  blockTitle: { fontSize: 13.5, fontWeight: "700", color: colors.text },
  pmRow: { flexDirection: "row", justifyContent: "space-between" },
  pmLabel: { fontSize: 12, color: colors.textMuted },
  pmValue: { fontSize: 12, fontWeight: "600", color: colors.text },
  warningBox: { flexDirection: "row", gap: spacing.xs, backgroundColor: "#FFF3E6", borderRadius: radius.sm, padding: spacing.sm },
  warningText: { flex: 1, fontSize: 11.5, color: "#95530F", lineHeight: 15 },

  requestBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  requestBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  errorText: { color: colors.danger, fontSize: 11.5, marginTop: spacing.xs },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing.sm },
  payoutAmount: { fontSize: 13.5, fontWeight: "700", color: colors.text },
  payoutMeta: { fontSize: 10.5, color: colors.textMuted, marginTop: 1 },
  paidBadge: { backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  paidBadgeText: { fontSize: 11, fontWeight: "600", color: colors.primary },
  markPaidBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2 },
  markPaidText: { fontSize: 11.5, fontWeight: "600", color: colors.text },
});
