import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { colors, radius, spacing } from "./theme";

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
}

export function TextField({ label, error, style, containerStyle, rightElement, leftElement, ...props }: TextFieldProps) {
  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View>
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            error && styles.inputError,
            rightElement ? { paddingRight: 44 } : null,
            leftElement ? { paddingLeft: 56 } : null,
            style,
          ]}
          {...props}
        />
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
        {leftElement ? <View style={styles.leftElement}>{leftElement}</View> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "500", color: colors.text, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: "#fff",
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
  rightElement: {
    position: "absolute",
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  leftElement: {
    position: "absolute",
    left: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  },
});
