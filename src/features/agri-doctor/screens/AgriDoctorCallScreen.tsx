import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BadgeCheck, PhoneOff } from "lucide-react-native";
import { Button } from "../../../components/Button";
import { colors, radius, spacing } from "../../../components/theme";
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
        <View style={styles.emojiWrap}><Text style={{ fontSize: 48 }}>{doctor?.emoji ?? "🌾"}</Text></View>
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
  emojiWrap: { width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  callName: { color: "#fff", fontSize: 19, fontWeight: "700" },
  callSpeciality: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  callStatus: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: spacing.sm },
  callChargeLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11 },
  callChargeValue: { color: "#fff", fontSize: 30, fontWeight: "700" },
  callRateNote: { color: "rgba(255,255,255,0.8)", fontSize: 10.5, marginTop: 2 },
  endCallBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" },

  endedContainer: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.sm },
  endedIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#E3E0EC", alignItems: "center", justifyContent: "center" },
  endedTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  endedSubtitle: { fontSize: 13, color: colors.textMuted },
  endedCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, width: "100%", maxWidth: 300, marginVertical: spacing.sm },
  endedRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  endedRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 4, paddingBottom: 6 },
  endedLabel: { fontSize: 13, color: colors.textMuted },
  endedValue: { fontSize: 13, fontWeight: "700", color: colors.text },
  endedSubLabel: { fontSize: 11, color: colors.textMuted, paddingLeft: spacing.sm },
  endedSubValue: { fontSize: 11, color: colors.textMuted },
});
