import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { colors, spacing } from "./theme";

export function LoadingView({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? <Text style={styles.mutedText}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.mutedText}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.md, width: "70%" }}>
          <Button title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.center}>
      <Text style={[styles.title, { color: colors.danger }]}>Something went wrong</Text>
      <Text style={styles.mutedText}>{message}</Text>
      {onRetry ? (
        <View style={{ marginTop: spacing.md, width: "70%" }}>
          <Button title="Retry" onPress={onRetry} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: { fontSize: 16, fontWeight: "600", color: colors.text, textAlign: "center" },
  mutedText: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    textAlign: "center",
  },
});
