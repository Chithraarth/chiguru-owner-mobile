import React, { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Pencil, Wallet, X } from "lucide-react-native";
import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { colors, radius, shadow, spacing } from "../../components/theme";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The period the labour screens show. A "week" follows whichever pay week applies (farm or group). */
export type Period =
  | { kind: "week"; anchor: string }
  | { kind: "range"; from: string; to: string }
  | { kind: "all" };

export function isoOf(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
export function todayIso() {
  return isoOf(new Date());
}
function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoOf(d);
}
function fmt(iso: string, withYear = false) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

/** "Sat → Fri" for a week starting on `start` (0 = Sunday). */
export function payWeekLabel(start: number) {
  return `${DAY_SHORT[start]} → ${DAY_SHORT[(start + 6) % 7]}`;
}

/** Concrete dates for a period; `to` is the pay day of a week. */
export function resolvePeriod(p: Period, weekStart: number): { from: string | null; to: string | null; label: string } {
  if (p.kind === "all") return { from: null, to: null, label: "Whole season" };
  if (p.kind === "range") {
    return { from: p.from, to: p.to, label: p.from === p.to ? fmt(p.from, true) : `${fmt(p.from)} – ${fmt(p.to)}` };
  }
  const a = new Date(`${p.anchor}T00:00:00`);
  const back = (a.getDay() - weekStart + 7) % 7;
  const from = addDays(p.anchor, -back);
  const to = addDays(from, 6);
  return { from, to, label: `${fmt(from)} – ${fmt(to)}` };
}

export function inPeriod(date: string, r: { from: string | null; to: string | null }) {
  return (r.from == null || date >= r.from) && (r.to == null || date <= r.to);
}

/** Move a period back (-1) or forward (+1) by its own length. */
function stepPeriod(p: Period, dir: -1 | 1): Period {
  if (p.kind === "week") return { kind: "week", anchor: addDays(p.anchor, dir * 7) };
  if (p.kind === "range") {
    const len = Math.round((new Date(`${p.to}T00:00:00`).getTime() - new Date(`${p.from}T00:00:00`).getTime()) / 86_400_000) + 1;
    return { kind: "range", from: addDays(p.from, dir * len), to: addDays(p.to, dir * len) };
  }
  return p;
}

/** ‹ Sat 3 Oct – Fri 9 Oct › — tap the dates to choose another period. */
export function PeriodBar({ period, weekStart, onChange }: { period: Period; weekStart: number; onChange: (p: Period) => void }) {
  const [open, setOpen] = useState(false);
  const r = resolvePeriod(period, weekStart);
  const canStep = period.kind !== "all";
  const nextFrom = canStep ? resolvePeriod(stepPeriod(period, 1), weekStart).from : null;
  const canNext = canStep && nextFrom != null && nextFrom <= todayIso();
  return (
    <>
      <View style={styles.bar}>
        <Pressable
          onPress={() => canStep && onChange(stepPeriod(period, -1))}
          disabled={!canStep}
          style={[styles.arrow, !canStep && { opacity: 0.3 }]}
          accessibilityRole="button"
          accessibilityLabel="Previous period"
        >
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => setOpen(true)} style={styles.dateBtn} accessibilityRole="button" accessibilityLabel="Choose dates">
          <CalendarDays size={17} color={colors.primary} />
          <Text style={styles.dateText} numberOfLines={1}>{r.label}</Text>
        </Pressable>
        <Pressable
          onPress={() => canNext && onChange(stepPeriod(period, 1))}
          disabled={!canNext}
          style={[styles.arrow, !canNext && { opacity: 0.3 }]}
          accessibilityRole="button"
          accessibilityLabel="Next period"
        >
          <ChevronRight size={22} color={colors.text} />
        </Pressable>
      </View>
      {open ? (
        <PeriodSheet visible period={period} weekStart={weekStart} onClose={() => setOpen(false)} onPick={(p) => { onChange(p); setOpen(false); }} />
      ) : null}
    </>
  );
}

function PeriodSheet({
  visible,
  period,
  weekStart,
  onClose,
  onPick,
}: {
  visible: boolean;
  period: Period;
  weekStart: number;
  onClose: () => void;
  onPick: (p: Period) => void;
}) {
  const r = resolvePeriod(period, weekStart);
  const [from, setFrom] = useState(r.from ?? todayIso());
  const [to, setTo] = useState(r.to ?? todayIso());
  const [picking, setPicking] = useState<"from" | "to" | null>(null);
  const today = todayIso();
  const quick: { label: string; p: Period }[] = [
    { label: "This pay week", p: { kind: "week", anchor: today } },
    { label: "Last pay week", p: { kind: "week", anchor: addDays(today, -7) } },
    { label: "This month", p: { kind: "range", from: `${today.slice(0, 7)}-01`, to: today } },
    { label: "This year", p: { kind: "range", from: `${today.slice(0, 4)}-01-01`, to: today } },
    { label: "Whole season", p: { kind: "all" } },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>Show records for</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close"><X size={22} color={colors.textMuted} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.lg }}>
          <View style={styles.quickRow}>
            {quick.map((q) => (
              <Pressable key={q.label} onPress={() => onPick(q.p)} style={styles.quickChip} accessibilityRole="button">
                <Text style={styles.quickText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.pickTitle}>Or pick dates</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Pressable onPress={() => setPicking("from")} style={[styles.dateField, picking === "from" && styles.dateFieldOn]} accessibilityRole="button">
              <Text style={styles.fieldLabel}>From</Text>
              <Text style={styles.fieldValue}>{fmt(from, true)}</Text>
            </Pressable>
            <Pressable onPress={() => setPicking("to")} style={[styles.dateField, picking === "to" && styles.dateFieldOn]} accessibilityRole="button">
              <Text style={styles.fieldLabel}>To</Text>
              <Text style={styles.fieldValue}>{fmt(to, true)}</Text>
            </Pressable>
          </View>
          {picking ? (
            <DateTimePicker
              value={new Date(`${picking === "from" ? from : to}T00:00:00`)}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              maximumDate={new Date()}
              onChange={(event, d) => {
                if (Platform.OS !== "ios") setPicking(null);
                if (event.type !== "set" || !d) return;
                const v = isoOf(d);
                if (picking === "from") {
                  setFrom(v);
                  if (v > to) setTo(v);
                  if (Platform.OS === "ios") setPicking("to");
                } else {
                  setTo(v);
                  if (v < from) setFrom(v);
                  if (Platform.OS === "ios") setPicking(null);
                }
              }}
            />
          ) : null}
          <Button title="Show these dates" onPress={() => onPick({ kind: "range", from, to })} />
        </ScrollView>
      </View>
    </Modal>
  );
}

/**
 * "💰 Pay week: Sat → Fri ✎". `inherit` adds a "Same as farm" option (for a
 * work group); `value` null means it follows the farm.
 */
export function PayWeekChip({
  value,
  farmStart,
  inherit = false,
  editable = true,
  onChange,
}: {
  value: number | null;
  farmStart: number;
  inherit?: boolean;
  editable?: boolean;
  onChange: (start: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const start = value ?? farmStart;
  const label = inherit && value == null ? `${payWeekLabel(start)} · same as farm` : payWeekLabel(start);
  return (
    <>
      <Pressable
        onPress={() => editable && setOpen(true)}
        disabled={!editable}
        style={styles.payChip}
        accessibilityRole="button"
        accessibilityLabel={`Pay week ${label}. ${editable ? "Change" : ""}`}
      >
        <Wallet size={16} color={colors.primary} />
        <Text style={styles.payChipText} numberOfLines={1}>
          Pay week: <Text style={{ fontWeight: "800", color: colors.text }}>{label}</Text>
        </Text>
        {editable ? <Pencil size={15} color={colors.textMuted} /> : null}
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{inherit ? "Pay week for this group" : "Pay week for the farm"}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Close"><X size={22} color={colors.textMuted} /></Pressable>
          </View>
          <Text style={styles.sheetHint}>The week starts on this day and you pay on the last day.</Text>
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }}>
            {inherit ? (
              <Pressable onPress={() => { onChange(null); setOpen(false); }} style={styles.dayRow} accessibilityRole="button">
                <Text style={styles.dayText}>Same as farm ({payWeekLabel(farmStart)})</Text>
                {value == null ? <Check size={20} color={colors.primary} /> : null}
              </Pressable>
            ) : null}
            {DAY_NAMES.map((name, d) => (
              <Pressable key={d} onPress={() => { onChange(d); setOpen(false); }} style={styles.dayRow} accessibilityRole="button">
                <Text style={styles.dayText}>
                  {name} → {DAY_NAMES[(d + 6) % 7]} <Text style={styles.dayMeta}>· pay on {DAY_NAMES[(d + 6) % 7]}</Text>
                </Text>
                {value === d || (!inherit && value == null && d === farmStart) ? <Check size={20} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.card, borderRadius: radius.pill, padding: 4, ...shadow },
  arrow: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  dateBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44 },
  dateText: { fontSize: 15.5, fontWeight: "700", color: colors.text },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "85%" },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  sheetHint: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.sm },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickChip: { minHeight: 44, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.border, justifyContent: "center", backgroundColor: colors.card },
  quickText: { fontSize: 15, fontWeight: "700", color: colors.text },
  pickTitle: { fontSize: 14, fontWeight: "700", color: colors.textMuted, marginTop: spacing.sm },
  dateField: { flex: 1, borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, minHeight: 56 },
  dateFieldOn: { borderColor: colors.primary, backgroundColor: colors.tint },
  fieldLabel: { fontSize: 12.5, color: colors.textMuted, fontWeight: "600" },
  fieldValue: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 2 },
  payChip: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", minHeight: 44, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.card, ...shadow },
  payChipText: { fontSize: 14.5, color: colors.textMuted, flexShrink: 1 },
  dayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayText: { fontSize: 16, fontWeight: "700", color: colors.text, flexShrink: 1 },
  dayMeta: { fontSize: 14, fontWeight: "400", color: colors.textMuted },
});
