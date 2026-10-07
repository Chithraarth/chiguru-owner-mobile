import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Briefcase, Clock, GraduationCap, Languages, Lock, MapPin, MessageCircle, Phone } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { LoadingView } from "../../../components/StateViews";
import { Avatar } from "../../../components/harvest";
import { colors, radius, spacing } from "../../../components/theme";
import { getAgronomist, getAppSettings } from "../../../api/endpoints/agriDoctor";
import { useUnlockDoctorContacts } from "../useUnlockDoctorContacts";
import { callDoctor, whatsappDoctor } from "./AgriDoctorScreen";

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      {icon}
      <Text style={styles.rowText}>{label}</Text>
    </View>
  );
}

export function AgriDoctorProfileScreen({ route }: { route: any }) {
  const doctorId: number = route.params.doctorId;
  const { data: d, isLoading } = useQuery({ queryKey: ["agronomist", doctorId], queryFn: () => getAgronomist(doctorId) });
  const settingsQuery = useQuery({ queryKey: ["app-settings"], queryFn: getAppSettings });
  const unlock = useUnlockDoctorContacts();
  const fee = settingsQuery.data?.doctorContactsFee ?? 10;

  if (isLoading || !d) return <LoadingView label="Loading doctor..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
      <Card>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Avatar name={d.name} index={3} size={80} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={styles.name}>{d.name}</Text>
              <BadgeCheck size={15} color={colors.primary} />
            </View>
            <Text style={styles.speciality}>{d.speciality}</Text>
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
      </Card>

      {d.contactPhone ? (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => callDoctor(d.contactPhone!)}>
            <Phone size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Call</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, { backgroundColor: "#1F9E5C" }]} onPress={() => whatsappDoctor(d.contactPhone!)}>
            <MessageCircle size={16} color="#fff" />
            <Text style={styles.actionBtnText}>WhatsApp</Text>
          </Pressable>
        </View>
      ) : d.contactLocked ? (
        <View style={styles.unlockCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Lock size={18} color="#92600E" />
            <Text style={styles.unlockText}>
              Pay ₹{fee} once from your wallet to see this and every other doctor's number.
            </Text>
          </View>
          <Button title={`Unlock numbers · ₹${fee}`} onPress={() => unlock.confirm(fee)} loading={unlock.isPending} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  name: { fontSize: 18, fontWeight: "700", color: colors.text },
  speciality: { fontSize: 14.5, color: colors.primary, fontWeight: "600", marginTop: 1 },
  rowText: { fontSize: 14.5, color: colors.text, flexShrink: 1 },
  bio: { fontSize: 14.5, color: colors.textMuted, marginTop: spacing.md, lineHeight: 18 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: radius.sm, minHeight: 48 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 15.5 },
  unlockCard: { backgroundColor: "#FEF3C7", borderRadius: 22, padding: spacing.md, gap: spacing.sm },
  unlockText: { flex: 1, fontSize: 14.5, color: "#92600E", lineHeight: 19 },
});
