import React from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { Text } from "../../../components/Text";
import { Handshake, Leaf, Megaphone, Sprout, Store, TrendingUp, Tractor, Users } from "lucide-react-native";
import { BigTiles } from "../../../components/harvest";
import { Enter } from "../../../components/motion";
import { colors, spacing } from "../../../components/theme";
import { useT } from "../../../lib/i18n";
import { useIsAdmin } from "../../../lib/useIsAdmin";

/** Market hub: sell or buy produce, rent or sell equipment, hire, nursery, market prices and your ads. */
export function ShopScreen({ navigation }: { navigation: any }) {
  const isAdmin = useIsAdmin();
  const { t } = useT();
  const go = (screen: string, params?: Record<string, unknown>) => () => navigation.navigate(screen, params);
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
      <Enter>
        <BigTiles
          items={[
            { icon: Store, title: "Sell produce", sub: "Post your crop", onPress: go("MarketplaceForm") },
            { icon: Leaf, title: t("more.market"), sub: "Buy from farmers near you", onPress: go("Marketplace") },
            { icon: Tractor, title: t("more.equipment"), sub: "Rent or sell", onPress: go("Equipment") },
            { icon: Handshake, title: "Hire board", sub: "Workers & jobs", onPress: go("Hire") },
            { icon: Sprout, title: t("more.nursery"), sub: "Saplings & seeds", onPress: go("Nursery") },
            { icon: TrendingUp, title: "Market prices", sub: "Today’s rates", onPress: go("Mandi") },
            { icon: Megaphone, title: "My ads", sub: "Everything you posted", onPress: go("MyAds") },
          ]}
        />
      </Enter>

      {isAdmin ? (
        <Pressable style={styles.adminLink} onPress={go("NurseryAdmin")} accessibilityRole="button">
          <Users size={16} color={colors.textMuted} />
          <Text style={styles.adminLinkText}>Nursery vendor admin</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  adminLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: spacing.sm, minHeight: 44 },
  adminLinkText: { fontSize: 15, color: colors.textMuted, fontWeight: "700" },
});
