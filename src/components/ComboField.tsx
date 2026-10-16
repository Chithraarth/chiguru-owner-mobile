import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Check, ChevronDown, ChevronUp } from "lucide-react-native";
import { Text } from "./Text";
import { TextField } from "./TextField";
import { colors, radius, shadow, spacing } from "./theme";

/**
 * A dropdown you can also type into: the arrow (or focusing the box) shows
 * the preset options, and anything typed is kept as-is when it isn't one.
 */
export function ComboField({
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  // While typing, narrow the list; when the box holds a preset, show them all.
  const exact = options.some((o) => o.toLowerCase() === q);
  const shown = q && !exact ? options.filter((o) => o.toLowerCase().includes(q)) : options;

  function pick(opt: string) {
    onChange(opt);
    setOpen(false);
  }

  return (
    <View style={{ marginBottom: spacing.md }}>
      <TextField
        label={label}
        value={value}
        onChangeText={(v) => {
          onChange(v);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoCapitalize="words"
        containerStyle={{ marginBottom: 0 }}
        rightElement={
          <Pressable onPress={() => setOpen((o) => !o)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Show ${label} options`}>
            {open ? <ChevronUp size={22} color={colors.text} /> : <ChevronDown size={22} color={colors.text} />}
          </Pressable>
        }
      />
      {open && shown.length > 0 ? (
        <View style={styles.menu}>
          {shown.map((opt, i) => {
            const selected = opt.toLowerCase() === q;
            return (
              <Pressable
                key={opt}
                onPress={() => pick(opt)}
                style={({ pressed }) => [styles.item, i > 0 && styles.divider, pressed && { backgroundColor: colors.tint }]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.itemText, selected && { fontWeight: "700" }]}>{opt}</Text>
                {selected ? <Check size={18} color={colors.primary} strokeWidth={2.6} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: { marginTop: 6, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden", ...shadow },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, paddingHorizontal: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  itemText: { fontSize: 16, color: colors.text },
});
