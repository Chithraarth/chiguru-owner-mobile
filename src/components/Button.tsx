import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "./Text";
import { colors, radius, spacing } from "./theme";

type IconType = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface ButtonProps {
  title: string;
  onPress: () => void;
  /** primary = leaf green, accent = sun yellow, secondary = white outline, light = soft yellow tint */
  variant?: "primary" | "secondary" | "danger" | "accent" | "light";
  size?: "default" | "compact";
  icon?: IconType;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const PALETTE = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
  accent: { bg: colors.accent, fg: colors.accentInk, border: colors.accent },
  secondary: { bg: colors.card, fg: colors.text, border: colors.border },
  light: { bg: colors.tint, fg: colors.text, border: colors.tint },
  danger: { bg: colors.danger, fg: "#FFFFFF", border: colors.danger },
};

export function Button({ title, onPress, variant = "primary", size = "default", icon: Icon, loading, disabled, style }: ButtonProps) {
  const isDisabled = disabled || loading;
  const p = PALETTE[variant];
  const compact = size === "compact";
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: p.bg, borderColor: p.border },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.inner}>
          {Icon ? <Icon size={compact ? 16 : 20} color={p.fg} strokeWidth={2.2} /> : null}
          <Text style={[styles.text, compact && styles.compactText, { color: p.fg }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 58,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  compact: { minHeight: 40, paddingHorizontal: spacing.md },
  inner: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  text: { fontSize: 18, fontWeight: "700" },
  compactText: { fontSize: 15 },
});
