import React from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  Clock,
  GraduationCap,
  Languages,
  MapPin,
  MessageSquare,
  Phone,
  Star,
} from "lucide-react-native";
import { Card } from "../../../components/Card";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { getAgronomist, startConsultation } from "../../../api/endpoints/agriDoctor";

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      {icon}
      <Text style={styles.rowText}>{label}</Text>
    </View>
  );
}

export function AgriDoctorProfileScreen({ navigation, route }: { navigation: any; route: any }) {
  const doctorId: number = route.params.doctorId;
  const { data: d, isLoading } = useQuery({ queryKey: ["agronomist", doctorId], queryFn: () => getAgronomist(doctorId) });

  const startMutation = useMutation({
    mutationFn: (mode: "chat" | "call") => startConsultation(doctorId, mode),
    onSuccess: (consultation, mode) => {
      if (!consultation) return;
      navigation.navigate(mode === "chat" ? "Consultation" : "AgriDoctorCall", { consultationId: consultation.id, doctorId });
    },
  });

  if (isLoading || !d) return <LoadingView label="Loading doctor..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Card>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={styles.emojiWrap}><Text style={{ fontSize: 34 }}>{d.emoji ?? "🌾"}</Text></View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={styles.name}>{d.name}</Text>
              <BadgeCheck size={15} color={colors.primary} />
            </View>
            <Text style={styles.speciality}>{d.speciality}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Star size={13} color="#F5A623" fill="#F5A623" />
                <Text style={styles.ratingText}>{Number(d.rating).toFixed(1)}</Text>
              </View>
              <Text style={[styles.onlineText, { color: d.isOnline ? "#1F9E5C" : colors.textMuted }]}>
                {d.isOnline ? "● Online" : "○ Offline"}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          {d.qualification ? <Row icon={<GraduationCap size={16} color={colors.primary} />} label={d.qualification} /> : null}
          {d.experience ? <Row icon={<Clock size={16} color={colors.primary} />} label={`${d.experience} experience`} /> : null}
          {d.workplace ? <Row icon={<Briefcase size={16} color={colors.primary} />} label={d.workplace} /> : null}
          {d.location ? <Row icon={<MapPin size={16} color={colors.primary} />} label={d.location} /> : null}
          {d.languages ? <Row icon={<Languages size={16} color={colors.primary} />} label={d.languages} /> : null}
          {d.contactPhone ? <Row icon={<Phone size={16} color={colors.primary} />} label={d.contactPhone} /> : null}
        </View>

        {d.bio ? <Text style={styles.bio}>{d.bio}</Text> : null}

        {d.certificateUrl ? (
          <View style={{ marginTop: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: spacing.xs }}>
              <BadgeCheck size={14} color={colors.primary} />
              <Text style={styles.certLabel}>Verified agriculture credential</Text>
            </View>
            <Image source={{ uri: d.certificateUrl }} style={styles.certImage} resizeMode="contain" />
          </View>
        ) : null}

        <View style={styles.planBox}>
          <Text style={styles.planLabel}>Consultation plan</Text>
          <Text style={styles.planValue}>{d.consultationPlan ?? `${inr(Number(d.ratePer15Min))} per 15 min`}</Text>
        </View>
      </Card>

      {!d.payoutReady ? (
        <View style={styles.warningBox}>
          <AlertTriangle size={16} color="#C77A2E" />
          <Text style={styles.warningText}>This doctor hasn't finished their payout setup yet, so they can't take consultations online.</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.primary }, (!d.payoutReady || startMutation.isPending) && { opacity: 0.5 }]}
          disabled={!d.payoutReady || startMutation.isPending}
          onPress={() => startMutation.mutate("chat")}
        >
          <MessageSquare size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Message</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: "#D9861F" }, (!d.payoutReady || startMutation.isPending) && { opacity: 0.5 }]}
          disabled={!d.payoutReady || startMutation.isPending}
          onPress={() => startMutation.mutate("call")}
        >
          <Phone size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Call</Text>
        </Pressable>
      </View>

      {d.contactPhone ? (
        <Pressable style={styles.dialBtn} onPress={() => Linking.openURL(`tel:${d.contactPhone!.replace(/\s/g, "")}`)}>
          <Phone size={15} color={colors.text} />
          <Text style={styles.dialBtnText}>Dial directly: {d.contactPhone}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  emojiWrap: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 17, fontWeight: "700", color: colors.text },
  speciality: { fontSize: 13, color: colors.primary, fontWeight: "600", marginTop: 1 },
  ratingText: { fontSize: 12, fontWeight: "700", color: colors.text },
  onlineText: { fontSize: 11, fontWeight: "600" },
  rowText: { fontSize: 13, color: colors.text, flexShrink: 1 },
  bio: { fontSize: 13, color: colors.textMuted, marginTop: spacing.md, lineHeight: 18 },
  certLabel: { fontSize: 11.5, fontWeight: "600", color: colors.primary },
  certImage: { width: "100%", height: 180, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff" },
  planBox: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm + 4, marginTop: spacing.md },
  planLabel: { fontSize: 11, color: colors.textMuted },
  planValue: { fontSize: 13.5, fontWeight: "700", color: colors.primary, marginTop: 2 },
  warningBox: { flexDirection: "row", gap: spacing.sm, backgroundColor: "#FFF3E6", borderWidth: 1, borderColor: "#FBD9AE", borderRadius: radius.sm, padding: spacing.sm + 4 },
  warningText: { flex: 1, fontSize: 12, color: "#95530F", lineHeight: 16 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: radius.sm, paddingVertical: spacing.md - 2 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  dialBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: spacing.sm + 2 },
  dialBtnText: { fontSize: 13, color: colors.text, fontWeight: "600" },
});
