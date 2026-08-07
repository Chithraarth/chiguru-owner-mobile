import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { TextField } from "./TextField";
import { colors, radius, spacing } from "./theme";

/** Cross-platform replacement for Alert.prompt (iOS-only in RN) - a simple numeric-input modal. */
export function PromptModal({
  visible,
  title,
  subtitle,
  onSubmit,
  onCancel,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.sheet}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <TextField keyboardType="decimal-pad" value={value} onChangeText={setValue} autoFocus />
        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <Button title="Cancel" variant="secondary" onPress={onCancel} />
          </View>
          <View style={{ width: spacing.sm }} />
          <View style={{ flex: 1 }}>
            <Button
              title="Save"
              onPress={() => {
                onSubmit(value);
                setValue("");
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    top: "35%",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, marginBottom: spacing.md, fontSize: 13 },
  actions: { flexDirection: "row", marginTop: spacing.sm },
});
