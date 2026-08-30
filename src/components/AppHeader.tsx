import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Menu, Store, CheckCircle2 } from "lucide-react-native";
import { colors, spacing } from "./theme";
import { AppDrawer } from "./AppDrawer";
import { EstateSwitcherModal } from "../features/estate/components/EstateSwitcherModal";

export function AppHeader({ navigation }: { navigation: any }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate("Mandi")} hitSlop={10} style={[styles.side, { alignItems: "flex-start" }]}>
          <Store size={18} color={colors.text} />
          <Text style={styles.marketLabel}>Market</Text>
        </Pressable>

        <Text style={styles.logo}>THE CHIGURU</Text>

        <View style={[styles.side, { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: spacing.sm }]}>
          <CheckCircle2 size={18} color={colors.accent} />
          <Pressable onPress={() => setDrawerOpen(true)} hitSlop={10}>
            <Menu size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <AppDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
        onSwitchFarm={() => setSwitcherOpen(true)}
      />
      <EstateSwitcherModal visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    height: 56,
  },
  side: { width: 56, justifyContent: "center" },
  logo: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: colors.primary,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  marketLabel: { fontSize: 9, fontWeight: "600", color: colors.text, marginTop: 1 },
});
