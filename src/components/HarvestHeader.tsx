import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackHeaderProps } from "@react-navigation/native-stack";
import { ChevronLeft, Menu } from "lucide-react-native";
import { Text } from "./Text";
import { RoundButton } from "./harvest";
import { AppDrawer } from "./AppDrawer";
import { EstateSwitcherModal } from "../features/estate/components/EstateSwitcherModal";
import { colors, radius, spacing } from "./theme";

/**
 * The yellow rounded header band every inner screen uses: a round back
 * button (or ☰ on a tab's first screen, which opens the left sidebar), the
 * screen title in big bold type, and the screen's own right-hand action.
 * Set per navigator as `screenOptions={{ header: (p) => <HarvestHeader {...p} /> }}`.
 */
export function HarvestHeader({ navigation, options, route, back }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const title = typeof options.headerTitle === "string" ? options.headerTitle : options.title ?? route.name;
  const subtitle = (options as { subtitle?: string }).subtitle;
  const right = options.headerRight?.({ tintColor: colors.accentInk, canGoBack: !!back });

  return (
    <View style={[styles.band, { paddingTop: insets.top + 12 }]}>
      {back ? (
        <RoundButton icon={ChevronLeft} label="Back" onPress={() => navigation.goBack()} />
      ) : (
        <RoundButton icon={Menu} label="Open menu" onPress={() => setDrawerOpen(true)} />
      )}
      <View style={styles.titleWrap}>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {title}
        </Text>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}

      {back ? null : (
        <>
          <AppDrawer
            visible={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            navigation={navigation}
            onSwitchFarm={() => setSwitcherOpen(true)}
          />
          <EstateSwitcherModal visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
        </>
      )}
    </View>
  );
}

export const harvestHeaderOptions = {
  header: (props: NativeStackHeaderProps) => <HarvestHeader {...props} />,
  contentStyle: { backgroundColor: colors.bg },
};

const styles = StyleSheet.create({
  band: {
    backgroundColor: colors.accent,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titleWrap: { flex: 1, minWidth: 0 },
  subtitle: { fontSize: 14, fontWeight: "600", color: colors.accentInkSoft },
  title: { fontSize: 26, fontWeight: "800", color: colors.accentInk, lineHeight: 32 },
  right: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
