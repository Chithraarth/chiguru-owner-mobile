import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Menu, Repeat } from "lucide-react-native";
import { Text } from "../../../components/Text";
import { HillsArt, Pill, RoundButton } from "../../../components/harvest";
import { colors } from "../../../components/theme";

/**
 * Big yellow band at the top of Home: ☰, a greeting, the farm name, a
 * "My farm / Invited farm" badge and a Switch farm pill, over rolling hills.
 */
export function HomeHeader({
  greetingName,
  farmName,
  subtitle,
  badge,
  onMenu,
  onSwitch,
  right,
}: {
  greetingName?: string | null;
  farmName: string;
  subtitle?: string | null;
  badge: string;
  onMenu?: () => void;
  onSwitch?: () => void;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.band, { paddingTop: insets.top + 12 }]}>
      <HillsArt height={120} />
      <View style={styles.topRow}>
        {onMenu ? <RoundButton icon={Menu} label="Open menu" onPress={onMenu} /> : <View />}
        <View style={{ flex: 1 }} />
        {right}
      </View>
      <View style={styles.body}>
        <Text style={styles.greet} numberOfLines={1}>
          नमस्कार{greetingName ? `, ${greetingName}` : ""}
        </Text>
        <Text style={styles.farm} numberOfLines={2}>
          {farmName}
        </Text>
        {subtitle ? (
          <Text style={styles.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.badges}>
          <Pill text={badge} tone="on" />
          {onSwitch ? (
            <Pressable onPress={onSwitch} accessibilityRole="button" style={({ pressed }) => [styles.switch, pressed && { opacity: 0.8 }]}>
              <Repeat size={15} color={colors.text} strokeWidth={2.2} />
              <Text style={styles.switchText}>Switch farm</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    backgroundColor: colors.accent,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 20,
    paddingBottom: 96,
    overflow: "hidden",
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  body: { paddingTop: 14 },
  greet: { fontSize: 18, fontWeight: "700", color: colors.accentInkSoft },
  farm: { fontSize: 32, fontWeight: "800", color: colors.accentInk, lineHeight: 36, textTransform: "capitalize" },
  sub: { fontSize: 15, fontWeight: "600", color: colors.accentInkSoft, marginTop: 2 },
  badges: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  switch: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  switchText: { fontSize: 14, fontWeight: "800", color: colors.text },
});
