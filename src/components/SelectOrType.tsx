import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { TextField } from "./TextField";
import { colors, radius, spacing } from "./theme";

const CUSTOM = "__custom__";

/**
 * Chip picker with a "type your own" fallback. Use anywhere a fixed preset
 * list (crop season, work-group category, payment method, etc.) shouldn't
 * block a farmer whose value isn't one of the presets.
 */
export function SelectOrType({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const isPreset = options.includes(value);
  const [customMode, setCustomMode] = useState(!isPreset && value !== "");
  const [customText, setCustomText] = useState(!isPreset ? value : "");

  function selectPreset(opt: string) {
    setCustomMode(false);
    onChange(opt);
  }

  function selectCustom() {
    setCustomMode(true);
    onChange(customText);
  }

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {options.map((opt) => {
            const selected = !customMode && opt === value;
            return (
              <Pressable
                key={opt}
                onPress={() => selectPreset(opt)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt}</Text>
              </Pressable>
            );
          })}
          <Pressable
            key={CUSTOM}
            onPress={selectCustom}
            style={[styles.chip, customMode && styles.chipSelected]}
          >
            <Text style={[styles.chipText, customMode && styles.chipTextSelected]}>Other…</Text>
          </Pressable>
        </View>
      </ScrollView>
      {customMode ? (
        <TextField
          value={customText}
          onChangeText={(v) => {
            setCustomText(v);
            onChange(v);
          }}
          placeholder="Type your own"
          containerStyle={{ marginTop: spacing.sm, marginBottom: 0 }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "500", color: colors.text, marginBottom: spacing.xs },
  row: { flexDirection: "row", gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextSelected: { color: "#fff", fontWeight: "600" },
});
