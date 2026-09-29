import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BadgeCheck, PhoneOff } from "lucide-react-native";
import { Button } from "../../../components/Button";
import { colors, radius, spacing, shadow } from "../../../components/theme";
import { endConsultation, getAgronomist } from "../../../api/endpoints/agriDoctor";
import type { AgriDoctorEndResult } from "../../../types/api";

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function fmtClock(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
function billing(elapsedSec: number, ratePer15: number) {
  const blocks = Math.max(1, Math.ceil(elapsedSec / (15 * 60)));
  return blocks * ratePer15;
}

function initials(name?: string | null) {
  return (name ?? "Dr").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

export function AgriDoctorCallScreen({ navigation, route }: { navigation: any; route: any }) {
  const consultationId: number = route.params.consultationId;
  const doctorId: number = route.params.doctorId;
  const [elapsed, setElapsed] = useState(0);
  const [ended, setEnded] = useState<AgriDoctorEndResult | null>(null);

  const { data: doctor } = useQuery({ queryKey: ["agronomist", doctorId], queryFn: () => getAgronomist(doctorId) });

  useEffect(() => {
    if (ended) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [ended]);

  const endMutation = useMutation({
    mutationFn: () => endConsultation(consultationId),
    onSuccess: (result) => { if (result) setEnded(result); },
  });

  const ratePer15 = doctor ? Number(doctor.ratePer15Min) : 0;
  const cost = billing(elapsed, ratePer15);

  if (ended) {
    return (
      <View style={styles.endedContainer}>
        <View style={styles.endedIconWrap}><BadgeCheck size={36} color={colors.primary} /></View>
        <Text style={styles.endedTitle}>Call complete</Text>
        <Text style={styles.endedSubtitle}>{doctor?.name} · {ended.minutes} min</Text>
        <View style={styles.endedCard}>
          <View style={styles.endedRow}><Text style={styles.endedLabel}>Charged</Text><Text style={styles.endedValue}>{inr(ended.cost)}</Text></View>
          <View style={styles.endedRow}><Text style={styles.endedSubLabel}>↳ Doctor (80%)</Text><Text style={styles.endedSubValue}>{inr(ended.doctorEarning)}</Text></View>
          <View style={[styles.endedRow, styles.endedRowBorder]}><Text style={styles.endedSubLabel}>↳ Platform fee (20%)</Text><Text style={styles.endedSubValue}>{inr(ended.platformFee)}</Text></View>
          <View style={styles.endedRow}><Text style={styles.endedLabel}>Wallet balance</Text><Text style={styles.endedValue}>{inr(ended.walletBalance)}</Text></View>
        </View>
        <Button title="Back to doctors" onPress={() => navigation.navigate("AgriDoctor")} />
      </View>
    );
  }

  return (
    <View style={styles.callContainer}>
      <View style={{ alignItems: "center", gap: spacing.sm, marginTop: spacing.xl }}>
        <View style={styles.emojiWrap}><Text style={{ fontSize: 40, fontWeight: "800", color: colors.accentInk }}>{initials(doctor?.name)}</Text></View>
        <Text style={styles.callName}>{doctor?.name}</Text>
        <Text style={styles.callSpeciality}>{doctor?.speciality}</Text>
        <Text style={styles.callStatus}>Connected · {fmtClock(elapsed)}</Text>
      </View>

      <View style={{ alignItems: "center" }}>
        <Text style={styles.callChargeLabel}>Current charge</Text>
        <Text style={styles.callChargeValue}>{inr(cost)}</Text>
        <Text style={styles.callRateNote}>{inr(ratePer15)} per 15 minutes</Text>
      </View>

      <Pressable style={styles.endCallBtn} onPress={() => endMutation.mutate()} disabled={endMutation.isPending}>
        <PhoneOff size={26} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  callContainer: { flex: 1, backgroundColor: colors.primary, alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.xl * 1.5 },
  emojiWrap: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  callName: { color: "#fff", fontSize: 26, fontWeight: "800" },
  callSpeciality: { color: "rgba(255,255,255,0.8)", fontSize: 14.5 },
  callStatus: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: spacing.sm },
  callChargeLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  callChargeValue: { color: "#fff", fontSize: 34, fontWeight: "800" },
  callRateNote: { color: "rgba(255,255,255,0.8)", fontSize: 12.5, marginTop: 2 },
  endCallBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" },

  endedContainer: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.sm },
  endedIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.successBg, alignItems: "center", justifyContent: "center" },
  endedTitle: { fontSize: 24, fontWeight: "800", color: colors.text },
  endedSubtitle: { fontSize: 14.5, color: colors.textMuted },
  endedCard: { backgroundColor: colors.card, borderRadius: 22, ...shadow, padding: spacing.md, width: "100%", maxWidth: 300, marginVertical: spacing.sm },
  endedRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  endedRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 4, paddingBottom: 6 },
  endedLabel: { fontSize: 14.5, color: colors.textMuted },
  endedValue: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  endedSubLabel: { fontSize: 13, color: colors.textMuted, paddingLeft: spacing.sm },
  endedSubValue: { fontSize: 13, color: colors.textMuted },
});
