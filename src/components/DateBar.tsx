import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react-native";
import { Text } from "./Text";
import { colors, radius, shadow, spacing } from "./theme";

export function fmtDay(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function toIso(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/**
 * Pick one day to look at: ‹ › jump to the previous/next day that has
 * records, the calendar picks any date, and "All days" (when allowed)
 * clears the choice. `value` null means all days.
 */
export function DateBar({
  dates,
  value,
  onChange,
  allowAll = true,
}: {
  /** Days that have records, any order (YYYY-MM-DD). */
  dates: string[];
  value: string | null;
  onChange: (date: string | null) => void;
  allowAll?: boolean;
}) {
  const [picking, setPicking] = useState(false);
  const sorted = [...new Set(dates)].sort();
  const current = value ?? sorted[sorted.length - 1] ?? toIso(new Date());
  const older = [...sorted].reverse().find((d) => d < current) ?? null;
  const newer = sorted.find((d) => d > current) ?? null;

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={styles.bar}>
        <Pressable
          onPress={() => older && onChange(older)}
          disabled={!older}
          hitSlop={8}
          style={[styles.arrow, !older && { opacity: 0.3 }]}
          accessibilityRole="button"
          accessibilityLabel="Previous day with records"
        >
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => setPicking(true)} style={styles.dateBtn} accessibilityRole="button" accessibilityLabel="Pick a date">
          <CalendarDays size={17} color={colors.primary} />
          <Text style={styles.dateText} numberOfLines={1}>
            {value ? fmtDay(value) : "All days"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => newer && onChange(newer)}
          disabled={!newer}
          hitSlop={8}
          style={[styles.arrow, !newer && { opacity: 0.3 }]}
          accessibilityRole="button"
          accessibilityLabel="Next day with records"
        >
          <ChevronRight size={22} color={colors.text} />
        </Pressable>
        {allowAll && value ? (
          <Pressable onPress={() => onChange(null)} style={styles.allBtn} accessibilityRole="button">
            <Text style={styles.allText}>All days</Text>
          </Pressable>
        ) : null}
      </View>
      {picking ? (
        <DateTimePicker
          value={new Date(`${current}T00:00:00`)}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          maximumDate={new Date()}
          onChange={(event, picked) => {
            setPicking(false);
            if (event.type === "set" && picked) onChange(toIso(picked));
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.card, borderRadius: radius.pill, padding: 4, ...shadow },
  arrow: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  dateBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44 },
  dateText: { fontSize: 15.5, fontWeight: "700", color: colors.text },
  allBtn: { backgroundColor: colors.tint, borderRadius: radius.pill, paddingHorizontal: 12, minHeight: 36, justifyContent: "center" },
  allText: { fontSize: 13.5, fontWeight: "700", color: colors.primary },
});
