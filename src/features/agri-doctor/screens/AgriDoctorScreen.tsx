import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Lock, MapPin, MessageCircle, Phone, Plus, Stethoscope } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { LoadingView } from "../../../components/StateViews";
import { Avatar } from "../../../components/harvest";
import { colors, radius, spacing } from "../../../components/theme";
import { getAgronomists, getAppSettings } from "../../../api/endpoints/agriDoctor";
import { useUnlockDoctorContacts } from "../useUnlockDoctorContacts";

export function callDoctor(phone: string) {
  Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`);
}

export function whatsappDoctor(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  Linking.openURL(`https://wa.me/${digits}`);
}

/** Agri Doctor: agriculture doctors near the farm, with their numbers once unlocked. */
export function AgriDoctorScreen({ navigation }: { navigation: any }) {
  const agronomistsQuery = useQuery({ queryKey: ["agronomists"], queryFn: getAgronomists });
  const settingsQuery = useQuery({ queryKey: ["app-settings"], queryFn: getAppSettings });
  const unlock = useUnlockDoctorContacts();

  if (agronomistsQuery.isLoading) return <LoadingView label="Loading agri doctors..." />;

  const settings = settingsQuery.data;
  const locked = settings ? !settings.canUseAgriDoctor : false;
  const doctors = agronomistsQuery.data ?? [];
  const fee = settings?.doctorContactsFee ?? 10;
  const needsUnlock = doctors.some((d) => d.contactLocked);

  const hero = (
    <View style={styles.hero}>
      <View style={styles.heroIconWrap}><Stethoscope size={20} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.heroTitle}>Agriculture Doctor</Text>
        <Text style={styles.heroSubtitle}>Agronomists and crop doctors near your farm. Call them directly.</Text>
      </View>
    </View>
  );

  if (locked) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
        {hero}
        <View style={styles.lockCard}>
          <View style={styles.lockIconWrap}><Lock size={22} color="#92600E" /></View>
          <Text style={styles.lockTitle}>Subscribe to use Agri Doctor</Text>
          <Text style={styles.lockSubtitle}>Find agriculture doctors near your farm and get their numbers with a Chiguru plan.</Text>
          <Button title="See plans" onPress={() => navigation.navigate("Subscription")} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
      {hero}

      {needsUnlock ? (
        <View style={styles.unlockCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <View style={styles.lockIconWrapSmall}><Lock size={18} color="#92600E" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.unlockTitle}>See every doctor's number</Text>
              <Text style={styles.unlockSubtitle}>
                Pay ₹{fee} once from your wallet. All numbers stay open for you, including doctors who join later.
              </Text>
            </View>
          </View>
          <Button title={`Unlock numbers · ₹${fee}`} onPress={() => unlock.confirm(fee)} loading={unlock.isPending} />
        </View>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={styles.sectionTitle}>Doctors near you</Text>
        <Pressable style={styles.addLink} onPress={() => navigation.navigate("AgriExpertHub")} accessibilityRole="button">
          <Plus size={15} color={colors.primary} />
          <Text style={styles.addLinkText}>I'm a doctor</Text>
        </Pressable>
      </View>

      {doctors.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>No agriculture doctors are listed yet. Check back soon.</Text>
        </Card>
      ) : (
        doctors.map((d, i) => (
          <Pressable key={d.id} onPress={() => navigation.navigate("AgriDoctorProfile", { doctorId: d.id })}>
            <Card>
              <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
                <Avatar name={d.name} index={i} size={52} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={styles.docName}>{d.name}</Text>
                    {d.nearby ? (
                      <View style={styles.nearbyBadge}><Text style={styles.nearbyText}>Near you</Text></View>
                    ) : null}
                  </View>
                  <Text style={styles.docSpeciality}>{d.speciality}</Text>
                  {d.location ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
                      <MapPin size={12} color={colors.textMuted} />
                      <Text style={styles.docMeta} numberOfLines={1}>{d.location}</Text>
                    </View>
                  ) : null}
                </View>
                <ChevronRight size={16} color={colors.border} />
              </View>

              {d.contactPhone ? (
                <View style={styles.contactRow}>
                  <Pressable style={[styles.contactBtn, { backgroundColor: colors.primary }]} onPress={() => callDoctor(d.contactPhone!)}>
                    <Phone size={15} color="#fff" />
                    <Text style={styles.contactBtnText}>Call</Text>
                  </Pressable>
                  <Pressable style={[styles.contactBtn, { backgroundColor: "#1F9E5C" }]} onPress={() => whatsappDoctor(d.contactPhone!)}>
                    <MessageCircle size={15} color="#fff" />
                    <Text style={styles.contactBtnText}>WhatsApp</Text>
                  </Pressable>
                </View>
              ) : d.contactLocked ? (
                <View style={styles.lockedRow}>
                  <Lock size={13} color={colors.textMuted} />
                  <Text style={styles.docMeta}>Number hidden · unlock above</Text>
                </View>
              ) : null}
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.accent, borderRadius: 28, padding: spacing.lg },
  heroIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: colors.accentInk, fontSize: 18, fontWeight: "800" },
  heroSubtitle: { color: colors.accentInkSoft, fontSize: 14.5, marginTop: 2, lineHeight: 19 },
  lockCard: { backgroundColor: "#FEF3C7", borderRadius: 22, padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  lockIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  lockIconWrapSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  lockTitle: { fontSize: 17, fontWeight: "800", color: "#92600E", textAlign: "center" },
  lockSubtitle: { fontSize: 14.5, color: "#92600E", textAlign: "center", lineHeight: 19 },
  unlockCard: { backgroundColor: "#FEF3C7", borderRadius: 22, padding: spacing.md, gap: spacing.sm },
  unlockTitle: { fontSize: 15.5, fontWeight: "800", color: "#92600E" },
  unlockSubtitle: { fontSize: 13.5, color: "#92600E", marginTop: 1, lineHeight: 18 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  addLink: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, paddingHorizontal: 4 },
  addLinkText: { fontSize: 14.5, fontWeight: "700", color: colors.primary },
  emptyText: { fontSize: 14.5, color: colors.textMuted, textAlign: "center" },
  docName: { fontSize: 16, fontWeight: "700", color: colors.text },
  docSpeciality: { fontSize: 14, color: colors.primary, fontWeight: "600", marginTop: 1 },
  docMeta: { fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  nearbyBadge: { backgroundColor: "#E3F4EA", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  nearbyText: { fontSize: 12, fontWeight: "700", color: "#1F7A4A" },
  contactRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  contactBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: radius.sm, minHeight: 44 },
  contactBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  lockedRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing.sm },
});
