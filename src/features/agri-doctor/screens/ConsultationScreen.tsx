import React, { useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Clock, Send, User } from "lucide-react-native";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { endConsultation, getAgronomist, getConsultationMessages, sendConsultationMessage } from "../../../api/endpoints/agriDoctor";
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

export function ConsultationScreen({ navigation, route }: { navigation: any; route: any }) {
  const consultationId: number = route.params.consultationId;
  const doctorId: number | undefined = route.params.doctorId;
  const [input, setInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [ended, setEnded] = useState<AgriDoctorEndResult | null>(null);
  const queryClient = useQueryClient();

  const { data: doctor } = useQuery({ queryKey: ["agronomist", doctorId], queryFn: () => getAgronomist(doctorId!), enabled: doctorId != null });
  const messagesQuery = useQuery({
    queryKey: ["consultation-messages", consultationId],
    queryFn: () => getConsultationMessages(consultationId),
    refetchInterval: 4000,
  });

  useEffect(() => {
    if (ended) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [ended]);

  const sendMutation = useMutation({
    mutationFn: (text: string) => sendConsultationMessage(consultationId, text),
    onSuccess: () => {
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["consultation-messages", consultationId] });
    },
  });

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
        <Text style={styles.endedTitle}>Consultation complete</Text>
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

  if (messagesQuery.isLoading) return <LoadingView label="Loading consultation..." />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.header}>
        <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 4 }} onPress={() => endMutation.mutate()} disabled={endMutation.isPending}>
          <ArrowLeft size={14} color="#fff" />
          <Text style={styles.headerEndText}>End & bill</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Clock size={13} color="#fff" />
            <Text style={styles.headerTimer}>{fmtClock(elapsed)}</Text>
          </View>
          <Text style={styles.headerCost}>{inr(cost)}</Text>
        </View>
      </View>

      <FlatList
        data={messagesQuery.data ?? []}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => {
          const isFarmer = item.sender === "farmer";
          return (
            <View style={[styles.msgRow, isFarmer && { flexDirection: "row-reverse" }]}>
              <View style={[styles.avatar, { backgroundColor: isFarmer ? colors.primary : colors.bg }]}>
                {isFarmer ? <User size={14} color="#fff" /> : <Text style={{ fontSize: 14 }}>{doctor?.emoji ?? "🌾"}</Text>}
              </View>
              <View style={[styles.bubble, isFarmer ? styles.farmerBubble : styles.doctorBubble]}>
                <Text style={isFarmer ? styles.farmerText : styles.doctorText}>{item.text}</Text>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <View style={{ flex: 1 }}>
          <TextField placeholder="Describe your crop problem…" value={input} onChangeText={setInput} containerStyle={{ marginBottom: 0 }} multiline />
        </View>
        <Pressable
          style={[styles.sendBtn, (!input.trim() || sendMutation.isPending) && { opacity: 0.5 }]}
          onPress={() => sendMutation.mutate(input.trim())}
          disabled={!input.trim() || sendMutation.isPending}
        >
          <Send size={16} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerEndText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  headerTimer: { color: "#fff", fontSize: 12 },
  headerCost: { color: "#fff", fontSize: 13, fontWeight: "700" },

  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.xs },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: "78%", borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  farmerBubble: { backgroundColor: colors.primary, borderTopRightRadius: 4 },
  doctorBubble: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderTopLeftRadius: 4 },
  farmerText: { color: "#fff", fontSize: 13.5 },
  doctorText: { color: colors.text, fontSize: 13.5 },

  inputRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },

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
