import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ChevronRight, Lock, Plus, Star, Stethoscope, Wallet, X } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { getAgronomists, getAppSettings, topUpWallet } from "../../../api/endpoints/agriDoctor";

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function TopupModal({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const topup = useMutation({
    mutationFn: (amt: number) => topUpWallet(amt),
    onSuccess: () => { setAmount(""); onDone(); },
  });
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.topupSheet}>
        <View style={styles.topupHeader}>
          <Text style={styles.topupTitle}>Add money to wallet</Text>
          <Pressable onPress={onClose} hitSlop={10}><X size={20} color={colors.textMuted} /></Pressable>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {[100, 200, 500].map((a) => (
            <Pressable key={a} style={[styles.amountChip, amount === String(a) && styles.amountChipActive]} onPress={() => setAmount(String(a))}>
              <Text style={[styles.amountChipText, amount === String(a) && styles.amountChipTextActive]}>{inr(a)}</Text>
            </Pressable>
          ))}
        </View>
        <TextField label="Or enter amount (₹)" keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="500" />
        <Button title={amount ? `Add ${inr(Number(amount))}` : "Add money"} onPress={() => topup.mutate(Number(amount))} loading={topup.isPending} disabled={!Number(amount)} />
        <Text style={styles.topupNote}>Demo top-up · no real payment is taken</Text>
      </View>
    </Modal>
  );
}

export function AgriDoctorScreen({ navigation }: { navigation: any }) {
  const [topupOpen, setTopupOpen] = useState(false);
  const qc = useQueryClient();
  const agronomistsQuery = useQuery({ queryKey: ["agronomists"], queryFn: getAgronomists });
  const settingsQuery = useQuery({ queryKey: ["app-settings"], queryFn: getAppSettings });

  if (agronomistsQuery.isLoading) return <LoadingView label="Loading agri doctors..." />;

  const balance = Number(settingsQuery.data?.walletBalance ?? 0);
  const locked = settingsQuery.data ? !settingsQuery.data.canUseAgriDoctor : false;

  if (locked) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}><Stethoscope size={20} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Agriculture Doctor</Text>
            <Text style={styles.heroSubtitle}>Consult agronomists, professors & crop doctors to boost your yield</Text>
          </View>
        </View>
        <View style={styles.lockCard}>
          <View style={styles.lockIconWrap}><Lock size={22} color="#92600E" /></View>
          <Text style={styles.lockTitle}>Subscribe to consult Agri Doctor</Text>
          <Text style={styles.lockSubtitle}>Agri Doctor is free during your trial. Subscribe to a plan to keep messaging and calling crop doctors.</Text>
          <Button title="See plans" onPress={() => navigation.navigate("Subscription")} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <View style={styles.hero}>
        <View style={styles.heroIconWrap}><Stethoscope size={20} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Agriculture Doctor</Text>
          <Text style={styles.heroSubtitle}>Consult agronomists, professors & crop doctors to boost your yield</Text>
        </View>
      </View>

      <Card style={styles.walletRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View style={styles.walletIconWrap}><Wallet size={18} color="#92600E" /></View>
          <View>
            <Text style={styles.walletLabel}>Consultation wallet</Text>
            <Text style={styles.walletValue}>{inr(balance)}</Text>
          </View>
        </View>
        <Pressable style={styles.addMoneyBtn} onPress={() => setTopupOpen(true)}>
          <Plus size={14} color={colors.primary} />
          <Text style={styles.addMoneyText}>Add Money</Text>
        </Pressable>
      </Card>

      <Pressable style={styles.expertBanner} onPress={() => navigation.navigate("AgriExpertHub")}>
        <View style={styles.expertIconWrap}><BadgeCheck size={18} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.expertTitle}>Are you an agriculture expert?</Text>
          <Text style={styles.expertSubtitle}>Add your profile so farmers can consult you</Text>
        </View>
        <ChevronRight size={16} color={colors.primary} />
      </Pressable>

      <View>
        <Text style={styles.sectionLabel}>AVAILABLE DOCTORS</Text>
        <View style={{ gap: spacing.sm }}>
          {(agronomistsQuery.data ?? []).map((d) => (
            <Pressable key={d.id} onPress={() => navigation.navigate("AgriDoctorProfile", { doctorId: d.id })}>
              <Card style={styles.doctorRow}>
                <View style={styles.doctorEmojiWrap}><Text style={{ fontSize: 26 }}>{d.emoji ?? "🌾"}</Text></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={styles.doctorName} numberOfLines={1}>{d.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Star size={12} color="#F5A623" fill="#F5A623" />
                      <Text style={styles.ratingText}>{Number(d.rating).toFixed(1)}</Text>
                    </View>
                  </View>
                  <Text style={styles.doctorSpeciality} numberOfLines={1}>{d.speciality}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    {d.experience ? <Text style={styles.doctorMeta}>{d.experience}</Text> : null}
                    {d.location ? <Text style={styles.doctorMeta} numberOfLines={1}>· {d.location}</Text> : null}
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                    <Text style={styles.doctorRate}>{inr(Number(d.ratePer15Min))}/15 min</Text>
                    <Text style={[styles.onlineText, { color: d.isOnline ? "#1F9E5C" : colors.textMuted }]}>
                      {d.isOnline ? "● Online" : "○ Offline"}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </View>

      <TopupModal
        visible={topupOpen}
        onClose={() => setTopupOpen(false)}
        onDone={() => { setTopupOpen(false); qc.invalidateQueries({ queryKey: ["app-settings"] }); }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  hero: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md },
  heroIconWrap: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  heroSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 11.5, marginTop: 2 },

  lockCard: { backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A", borderRadius: radius.md, padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  lockIconWrap: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: "#FDE68A", alignItems: "center", justifyContent: "center" },
  lockTitle: { fontSize: 15, fontWeight: "700", color: "#92600E" },
  lockSubtitle: { fontSize: 12.5, color: "#92600E", textAlign: "center" },

  walletRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  walletIconWrap: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  walletLabel: { fontSize: 11, color: colors.textMuted },
  walletValue: { fontSize: 16, fontWeight: "700", color: colors.text },
  addMoneyBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2 },
  addMoneyText: { fontSize: 12.5, fontWeight: "600", color: colors.primary },

  expertBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm + 4 },
  expertIconWrap: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: "#E3E0EC", alignItems: "center", justifyContent: "center" },
  expertTitle: { fontSize: 13, fontWeight: "700", color: colors.primary },
  expertSubtitle: { fontSize: 11, color: colors.primary },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing.sm },
  doctorRow: { flexDirection: "row", gap: spacing.sm },
  doctorEmojiWrap: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  doctorName: { fontSize: 14.5, fontWeight: "700", color: colors.text, flexShrink: 1 },
  ratingText: { fontSize: 11.5, fontWeight: "700", color: colors.text },
  doctorSpeciality: { fontSize: 12, color: colors.primary, fontWeight: "600", marginTop: 1 },
  doctorMeta: { fontSize: 10.5, color: colors.textMuted },
  doctorRate: { fontSize: 12, fontWeight: "600", color: colors.text },
  onlineText: { fontSize: 10.5, fontWeight: "600" },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  topupSheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  topupHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topupTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  amountChip: { flex: 1, alignItems: "center", paddingVertical: spacing.sm + 2, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  amountChipActive: { borderColor: colors.primary, backgroundColor: colors.bg },
  amountChipText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  amountChipTextActive: { color: colors.primary },
  topupNote: { fontSize: 10.5, color: colors.textMuted, textAlign: "center" },
});
