import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { colors, radius, spacing } from "./theme";

export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md, // matches web's --radius: 1rem (16px)
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
});
