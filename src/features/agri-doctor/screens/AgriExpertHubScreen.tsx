import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { BadgeCheck, ChevronRight, UserPlus } from "lucide-react-native";
import { colors, radius, spacing, shadow } from "../../../components/theme";

export function AgriExpertHubScreen({ navigation }: { navigation: any }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
      <View style={styles.hero}>
        <View style={styles.heroIconWrap}><BadgeCheck size={26} color={colors.primary} /></View>
        <Text style={styles.heroTitle}>For agriculture experts</Text>
        <Text style={styles.heroSubtitle}>List yourself so farmers near you can find you and call you directly.</Text>
      </View>

      <Pressable style={styles.row} onPress={() => navigation.navigate("AgriDoctorRegister")}>
        <View style={[styles.iconWrap, { backgroundColor: "#FBF2D9" }]}><UserPlus size={18} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Add doctor profile</Text>
          <Text style={styles.rowSubtitle}>Your credentials, phone number and town</Text>
        </View>
        <ChevronRight size={16} color={colors.border} />
      </Pressable>

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
