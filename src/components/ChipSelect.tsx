import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { Check } from "lucide-react-native";
import { colors, radius, spacing } from "./theme";

export function ChipSelect({
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
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <Pressable
                key={opt}
                onPress={() => onChange(opt)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                {selected ? <Check size={16} color={colors.text} strokeWidth={2.6} /> : null}
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
  row: { flexDirection: "row", gap: 10 },
  chip: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 2.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: { backgroundColor: colors.tint, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 16, fontWeight: "700" },
  chipTextSelected: { color: colors.text },
});
