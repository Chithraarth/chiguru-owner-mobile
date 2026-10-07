import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChevronRight, Lock, Plus, Star, Stethoscope, Wallet } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { LoadingView } from "../../../components/StateViews";
import { Avatar } from "../../../components/harvest";
import { colors, radius, spacing } from "../../../components/theme";
import { getAgronomists, getAppSettings } from "../../../api/endpoints/agriDoctor";

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function AgriDoctorScreen({ navigation }: { navigation: any }) {
  const agronomistsQuery = useQuery({ queryKey: ["agronomists"], queryFn: getAgronomists });
  const settingsQuery = useQuery({ queryKey: ["app-settings"], queryFn: getAppSettings });

  if (agronomistsQuery.isLoading) return <LoadingView label="Loading agri doctors..." />;

  const balance = Number(settingsQuery.data?.walletBalance ?? 0);
  const locked = settingsQuery.data ? !settingsQuery.data.canUseAgriDoctor : false;

  if (locked) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}><Stethoscope size={20} color={colors.primary} /></View>
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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
      <View style={styles.hero}>
        <View style={styles.heroIconWrap}><Stethoscope size={20} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Agriculture Doctor</Text>
          <Text style={styles.heroSubtitle}>Consult agronomists, professors & crop doctors to boost your yield</Text>
        </View>
      </View>

      <Card style={styles.walletRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View style={styles.walletIconWrap}><Wallet size={18} color="#92600E" /></View>
          <View>
            <Text style={styles.walletLabel}>Wallet balance</Text>
            <Text style={styles.walletValue}>{inr(balance)}</Text>
          </View>
        </View>
        {/* Consultations are paid from the Chiguru wallet, recharged only
            through a real payment on the Wallet screen. */}
        <Pressable style={styles.addMoneyBtn} onPress={() => navigation.navigate("Wallet")}>
          <Plus size={14} color={colors.primary} />
          <Text style={styles.addMoneyText}>Recharge</Text>
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
                <Avatar name={d.name} index={d.id} size={52} />
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  hero: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.accent, borderRadius: 28, padding: spacing.md },
  heroIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: colors.accentInk, fontSize: 18, fontWeight: "800" },
  heroSubtitle: { color: colors.accentInkSoft, fontSize: 13.5, marginTop: 2 },

  lockCard: { backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A", borderRadius: radius.md, padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  lockIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FDE68A", alignItems: "center", justifyContent: "center" },
  lockTitle: { fontSize: 16.5, fontWeight: "700", color: "#92600E" },
  lockSubtitle: { fontSize: 14.5, color: "#92600E", textAlign: "center" },

  walletRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  walletIconWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  walletLabel: { fontSize: 13, color: colors.textMuted },
  walletValue: { fontSize: 17, fontWeight: "700", color: colors.text },
  addMoneyBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2 },
  addMoneyText: { fontSize: 14.5, fontWeight: "600", color: colors.primary },

  expertBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm + 4 },
  expertIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FBF2D9", alignItems: "center", justifyContent: "center" },
  expertTitle: { fontSize: 14.5, fontWeight: "700", color: colors.primary },
  expertSubtitle: { fontSize: 13, color: colors.primary },

  sectionLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing.sm },
  doctorRow: { flexDirection: "row", gap: spacing.sm },
  doctorEmojiWrap: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  doctorName: { fontSize: 16, fontWeight: "700", color: colors.text, flexShrink: 1 },
  ratingText: { fontSize: 13.5, fontWeight: "700", color: colors.text },
  doctorSpeciality: { fontSize: 14, color: colors.primary, fontWeight: "600", marginTop: 1 },
  doctorMeta: { fontSize: 12.5, color: colors.textMuted },
  doctorRate: { fontSize: 14, fontWeight: "600", color: colors.text },
  onlineText: { fontSize: 12.5, fontWeight: "600" },

});
