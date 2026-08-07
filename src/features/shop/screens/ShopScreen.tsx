import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Sprout, Store, Tractor, Users } from "lucide-react-native";
import { colors, radius, spacing } from "../../../components/theme";
import { useT } from "../../../lib/i18n";

export function ShopScreen({ navigation }: { navigation: any }) {
  const { t } = useT();
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        <Pressable style={[styles.tile, { backgroundColor: "#EDEBF7" }]} onPress={() => navigation.navigate("Nursery")}>
          <View style={styles.iconWrap}>
            <Sprout size={26} color={colors.primary} />
          </View>
          <Text style={[styles.tileText, { color: colors.primary }]}>{t("more.nursery")}</Text>
        </Pressable>
        <Pressable style={[styles.tile, { backgroundColor: colors.accent }]} onPress={() => navigation.navigate("Marketplace")}>
          <View style={styles.iconWrap}>
            <Store size={26} color="#fff" />
          </View>
          <Text style={[styles.tileText, { color: "#fff" }]}>{t("more.market")}</Text>
        </Pressable>
        <Pressable style={[styles.tile, { backgroundColor: colors.secondary }]} onPress={() => navigation.navigate("Equipment")}>
          <View style={styles.iconWrap}>
            <Tractor size={26} color={colors.text} />
          </View>
          <Text style={[styles.tileText, { color: colors.text }]}>{t("more.equipment")}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.adminLink} onPress={() => navigation.navigate("NurseryAdmin")}>
        <Users size={14} color={colors.textMuted} />
        <Text style={styles.adminLinkText}>Nursery vendor admin</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: { width: "47%", borderRadius: radius.md, padding: spacing.md, alignItems: "center", gap: spacing.sm },
  iconWrap: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: "rgba(255,255,255,0.5)", alignItems: "center", justifyContent: "center" },
  tileText: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  adminLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: spacing.lg, paddingVertical: spacing.sm },
  adminLinkText: { fontSize: 12.5, color: colors.textMuted, fontWeight: "500" },
});
