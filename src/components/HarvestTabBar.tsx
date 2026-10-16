import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Plus } from "lucide-react-native";
import { Text } from "./Text";
import { colors } from "./theme";

const TAB_LABELS: Record<string, string> = {
  DashboardTab: "Home",
  WorkTab: "Attendance",
  AccountsTab: "Accounts",
  SyncTab: "Sync",
};

/** The tab whose slot becomes the raised yellow ＋ in the middle of the bar. */
const CENTRE_TAB = "UpdatesTab";

/**
 * White bar attached to the bottom edge with a raised sun-yellow ＋ in the
 * centre (new work update). Replaces the old floating pill bar.
 */
export function HarvestTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        if (route.name === CENTRE_TAB) {
          return (
            <View key={route.key} style={styles.centreSlot}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add work update"
                onPress={() => navigation.navigate(CENTRE_TAB, { screen: "DailyUpdateForm", initial: false })}
                style={({ pressed }) => [styles.centre, pressed && { transform: [{ scale: 0.94 }] }]}
              >
                <Plus size={30} color={colors.accentInk} strokeWidth={2.6} />
              </Pressable>
            </View>
          );
        }

        const { options } = descriptors[route.key];
        const color = isFocused ? colors.primary : "#8A907F";
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            style={styles.tab}
          >
            {options.tabBarIcon?.({ focused: isFocused, color, size: 24 })}
            <Text style={[styles.label, { color }, isFocused && styles.labelActive]} numberOfLines={1}>
              {TAB_LABELS[route.name] ?? options.title ?? route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 10,
    shadowColor: "#5A4600",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  tab: { flex: 1, alignItems: "center", gap: 2, minHeight: 48, justifyContent: "center" },
  label: { fontSize: 12.5, fontWeight: "600" },
  labelActive: { fontWeight: "800" },
  centreSlot: { width: 76, alignItems: "center" },
  centre: {
    width: 66,
    height: 66,
    marginTop: -34,
    borderRadius: 33,
    backgroundColor: colors.accent,
    borderWidth: 5,
    borderColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5A4600",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
