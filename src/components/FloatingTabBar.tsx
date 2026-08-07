import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors, radius, spacing } from "./theme";

const TAB_LABELS: Record<string, string> = {
  DashboardTab: "Home",
  WorkTab: "Work Attendance",
  UpdatesTab: "Work Updates",
  AccountsTab: "Accounts",
  SyncTab: "Sync",
};

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + spacing.sm }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          const icon = options.tabBarIcon?.({
            focused: isFocused,
            color: isFocused ? colors.primary : "#FFFFFF",
            size: 20,
          });

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.tab, isFocused && styles.tabActive]}
            >
              {icon}
              {isFocused ? (
                <Text style={styles.activeLabel} numberOfLines={1}>
                  {TAB_LABELS[route.name] ?? route.name}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 8,
    width: "100%",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    gap: 6,
  },
  tabActive: { backgroundColor: "#E9E6FB" },
  activeLabel: { color: colors.primary, fontWeight: "700", fontSize: 12.5 },
});
