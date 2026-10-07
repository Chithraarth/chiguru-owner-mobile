import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { Banknote, BadgeCheck, ChevronRight, UserPlus } from "lucide-react-native";
import { colors, radius, spacing, shadow } from "../../../components/theme";
import { useIsAdmin } from "../../../lib/useIsAdmin";

export function AgriExpertHubScreen({ navigation }: { navigation: any }) {
  // Earnings & payouts are handled by the Chiguru team (admins) for now.
  const isAdmin = useIsAdmin();
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
      <View style={styles.hero}>
        <View style={styles.heroIconWrap}><BadgeCheck size={26} color={colors.primary} /></View>
        <Text style={styles.heroTitle}>For agriculture experts</Text>
        <Text style={styles.heroSubtitle}>Offer paid consultations to farmers. The Chiguru team pays your 80% share to the bank or UPI on your profile.</Text>
      </View>

      <Pressable style={styles.row} onPress={() => navigation.navigate("AgriDoctorRegister")}>
        <View style={[styles.iconWrap, { backgroundColor: "#FBF2D9" }]}><UserPlus size={18} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Add doctor profile</Text>
          <Text style={styles.rowSubtitle}>Register with your credentials so farmers can consult you</Text>
        </View>
        <ChevronRight size={16} color={colors.border} />
      </Pressable>

      {isAdmin ? (
      <Pressable style={styles.row} onPress={() => navigation.navigate("AgriDoctorEarnings")}>
        <View style={[styles.iconWrap, { backgroundColor: "#FEF3C7" }]}><Banknote size={18} color="#92600E" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Earnings & payouts</Text>
          <Text style={styles.rowSubtitle}>Track each doctor's 80% share and record payouts</Text>
        </View>
        <ChevronRight size={16} color={colors.border} />
      </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { backgroundColor: colors.accent, borderRadius: 28, padding: spacing.lg },
  heroIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  heroTitle: { color: colors.accentInk, fontSize: 18, fontWeight: "800" },
  heroSubtitle: { color: colors.accentInkSoft, fontSize: 14.5, marginTop: spacing.xs, lineHeight: 17 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.card, ...shadow, borderRadius: 22, padding: spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 15.5, fontWeight: "700", color: colors.text },
  rowSubtitle: { fontSize: 13.5, color: colors.textMuted, marginTop: 1 },
});
