import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronDown, Search, X } from "lucide-react-native";
import { Text, TextInput } from "./Text";
import { colors, radius, spacing } from "./theme";
import { COUNTRIES, Country, DEFAULT_COUNTRY, flagOf, splitPhone } from "./countries";

interface PhoneFieldProps {
  label?: string;
  /** Full number with country code ("+919876543210"), or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  autoFocus?: boolean;
  containerStyle?: ViewStyle;
}

/** Phone box with a country picker in front: 🇮🇳 +91 ▾ | 98765 43210 */
export function PhoneField({ label, value, onChange, placeholder = "98765 43210", error, autoFocus, containerStyle }: PhoneFieldProps) {
  const [country, setCountry] = useState<Country>(() => splitPhone(value).country);
  const [picking, setPicking] = useState(false);
  const { local } = splitPhone(value, country);

  // A number loaded later (e.g. from the server) brings its own country.
  useEffect(() => {
    if (value.startsWith("+")) setCountry((c) => splitPhone(value, c).country);
  }, [value]);

  const emit = (c: Country, digits: string) => onChange(digits ? `${c.dial}${digits}` : "");

  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <Pressable
          onPress={() => setPicking(true)}
          style={[styles.code, error ? styles.errorBorder : null]}
          accessibilityRole="button"
          accessibilityLabel={`Country ${country.name} ${country.dial}, change`}
        >
          <Text style={styles.flag}>{flagOf(country.iso)}</Text>
          <Text style={styles.dial}>{country.dial}</Text>
          <ChevronDown size={16} color={colors.textMuted} />
        </Pressable>
        <TextInput
          style={[styles.input, error ? styles.errorBorder : null]}
          keyboardType="phone-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={local}
          maxLength={15}
          autoFocus={autoFocus}
          onChangeText={(v) => {
            // Pasting a whole "+44 …" number switches the country too.
            if (v.trim().startsWith("+")) {
              const s = splitPhone(v, country);
              setCountry(s.country);
              emit(s.country, s.local);
            } else emit(country, v.replace(/\D/g, ""));
          }}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {picking ? (
        <CountrySheet
          current={country}
          onClose={() => setPicking(false)}
          onPick={(c) => {
            setCountry(c);
            setPicking(false);
            emit(c, local);
          }}
        />
      ) : null}
    </View>
  );
}

export function CountrySheet({ current, onPick, onClose }: { current: Country; onPick: (c: Country) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/^\+/, "");
    if (!s) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(s) || c.dial.slice(1).startsWith(s) || c.iso.toLowerCase() === s);
  }, [q]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>Choose country</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close"><X size={22} color={colors.textMuted} /></Pressable>
        </View>
        <View style={styles.search}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search country or code"
            placeholderTextColor={colors.textMuted}
            value={q}
            onChangeText={setQ}
            autoCorrect={false}
          />
        </View>
        <FlatList
          data={list}
          keyExtractor={(c) => c.iso}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const on = item.iso === current.iso;
            return (
              <Pressable onPress={() => onPick(item)} style={[styles.item, on && styles.itemOn]} accessibilityRole="button">
                <Text style={styles.flag}>{flagOf(item.iso)}</Text>
                <Text style={[styles.itemName, on && { color: colors.primary }]} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemDial}>{item.dial}</Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No country found</Text>}
        />
      </View>
    </Modal>
  );
}

export { DEFAULT_COUNTRY };

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
  row: { flexDirection: "row", gap: spacing.sm },
  code: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  flag: { fontSize: 22 },
  dial: { fontSize: 17, fontWeight: "700", color: colors.text },
  input: {
    flex: 1,
    minHeight: 54,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.card,
  },
  errorBorder: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: "600", marginTop: spacing.xs },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    height: "75%",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  sheetTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, minHeight: 46, fontSize: 16, color: colors.text },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 12, paddingHorizontal: spacing.sm, borderRadius: radius.md },
  itemOn: { backgroundColor: colors.tint },
  itemName: { flex: 1, fontSize: 16, color: colors.text },
  itemDial: { fontSize: 16, fontWeight: "700", color: colors.textMuted },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.lg },
});
