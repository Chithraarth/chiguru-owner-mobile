import React, { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Wallet, X } from "lucide-react-native";
import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { colors, radius, shadow, spacing } from "../../components/theme";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * How a farm (or one work group) pays: "weekly" from weekday `from` to
 * weekday `to` (0 = Sunday), or "monthly" from day `from` to day `to` of the
 * same month, or of the next month when `toNextMonth`.
 */
export interface PayCycle {
  cycle: "weekly" | "monthly";
  from: number;
  to: number;
  toNextMonth: boolean;
}
export const DEFAULT_PAY_CYCLE: PayCycle = { cycle: "weekly", from: 6, to: 5, toNextMonth: false };

/** The period the labour screens show. "cycle" is the pay cycle containing `anchor`. */
export type Period =
  | { kind: "cycle"; anchor: string }
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
function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${s}`;
}
/** Day `day` of month index `mi` (year*12 + month), clamped to the month's length. */
function dayOfMonth(mi: number, day: number) {
  const y = Math.floor(mi / 12);
  const m = mi % 12;
  const last = new Date(y, m + 1, 0).getDate();
  return isoOf(new Date(y, m, Math.min(day, last)));
}

/** "Mon → Sat" or "3rd → 30th next month". */
export function payCycleLabel(c: PayCycle) {
  if (c.cycle === "weekly") return `${DAY_SHORT[c.from]} → ${DAY_SHORT[c.to]}`;
  return `${ordinal(c.from)} → ${ordinal(c.to)}${c.toNextMonth ? " next month" : ""}`;
}

/** The pay cycle that contains `anchor` (or the latest one starting before it). */
function cycleDates(anchor: string, c: PayCycle): { from: string; to: string } {
  if (c.cycle === "weekly") {
    const back = (new Date(`${anchor}T00:00:00`).getDay() - c.from + 7) % 7;
    const from = addDays(anchor, -back);
    return { from, to: addDays(from, (c.to - c.from + 7) % 7) };
  }
  const span = c.toNextMonth ? 1 : 0;
  const step = monthStep(c);
  const a = new Date(`${anchor}T00:00:00`);
  let mi = a.getFullYear() * 12 + a.getMonth();
  mi -= ((mi % step) + step) % step;
  if (dayOfMonth(mi, c.from) > anchor) mi -= step;
  return { from: dayOfMonth(mi, c.from), to: dayOfMonth(mi + span, c.to) };
}
/** Months between one monthly cycle's start and the next. */
function monthStep(c: PayCycle) {
  return (c.toNextMonth ? 1 : 0) + (c.to >= c.from ? 1 : 0);
}

/** Concrete dates for a period; for a cycle, `to` is pay day. */
export function resolvePeriod(p: Period, c: PayCycle): { from: string | null; to: string | null; label: string } {
  if (p.kind === "all") return { from: null, to: null, label: "Whole season" };
  const r = p.kind === "range" ? { from: p.from, to: p.to } : cycleDates(p.anchor, c);
  return { ...r, label: r.from === r.to ? fmt(r.from, true) : `${fmt(r.from)} – ${fmt(r.to)}` };
}

export function inPeriod(date: string, r: { from: string | null; to: string | null }) {
  return (r.from == null || date >= r.from) && (r.to == null || date <= r.to);
}

/** Move a period back (-1) or forward (+1): a whole pay cycle, or the same number of days. */
function stepPeriod(p: Period, dir: -1 | 1, c: PayCycle): Period {
  if (p.kind === "cycle") {
    const { from } = cycleDates(p.anchor, c);
    if (c.cycle === "weekly") return { kind: "cycle", anchor: addDays(from, dir * 7) };
    const d = new Date(`${from}T00:00:00`);
    return { kind: "cycle", anchor: dayOfMonth(d.getFullYear() * 12 + d.getMonth() + dir * monthStep(c), c.from) };
  }
  if (p.kind === "range") {
    const len = Math.round((new Date(`${p.to}T00:00:00`).getTime() - new Date(`${p.from}T00:00:00`).getTime()) / 86_400_000) + 1;
    return { kind: "range", from: addDays(p.from, dir * len), to: addDays(p.to, dir * len) };
  }
  return p;
}

/** ‹ Sat 3 Oct – Fri 9 Oct › — tap the dates to choose another period. */
export function PeriodBar({ period, cycle, onChange }: { period: Period; cycle: PayCycle; onChange: (p: Period) => void }) {
  const [open, setOpen] = useState(false);
  const r = resolvePeriod(period, cycle);
  const canStep = period.kind !== "all";
  const nextFrom = canStep ? resolvePeriod(stepPeriod(period, 1, cycle), cycle).from : null;
  const canNext = canStep && nextFrom != null && nextFrom <= todayIso();
  return (
    <>
      <View style={styles.bar}>
        <Pressable
          onPress={() => canStep && onChange(stepPeriod(period, -1, cycle))}
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
          onPress={() => canNext && onChange(stepPeriod(period, 1, cycle))}
          disabled={!canNext}
          style={[styles.arrow, !canNext && { opacity: 0.3 }]}
          accessibilityRole="button"
          accessibilityLabel="Next period"
        >
          <ChevronRight size={22} color={colors.text} />
        </Pressable>
      </View>
      {open ? (
        <PeriodSheet visible period={period} cycle={cycle} onClose={() => setOpen(false)} onPick={(p) => { onChange(p); setOpen(false); }} />
      ) : null}
    </>
  );
}

function PeriodSheet({
  visible,
  period,
  cycle,
  onClose,
  onPick,
}: {
  visible: boolean;
  period: Period;
  cycle: PayCycle;
  onClose: () => void;
  onPick: (p: Period) => void;
}) {
  const r = resolvePeriod(period, cycle);
  const [from, setFrom] = useState(r.from ?? todayIso());
  const [to, setTo] = useState(r.to ?? todayIso());
  const [picking, setPicking] = useState<"from" | "to" | null>(null);
  const today = todayIso();
  const quick: { label: string; p: Period }[] = [
    { label: "This pay period", p: { kind: "cycle", anchor: today } },
    { label: "Last pay period", p: stepPeriod({ kind: "cycle", anchor: today }, -1, cycle) },
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
 * "💰 Pay: Weekly · Mon → Sat ✎". `inherit` (a work group) adds "Same as
 * farm"; `value` null means it follows the farm.
 */
export function PayCycleChip({
  value,
  farm,
  inherit = false,
  editable = true,
  onChange,
}: {
  value: PayCycle | null;
  farm: PayCycle;
  inherit?: boolean;
  editable?: boolean;
  onChange: (c: PayCycle | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const shown = value ?? farm;
  const label = `${shown.cycle === "weekly" ? "Weekly" : "Monthly"} · ${payCycleLabel(shown)}${inherit && value == null ? " · same as farm" : ""}`;
  return (
    <>
      <Pressable
        onPress={() => editable && setOpen(true)}
        disabled={!editable}
        style={styles.payChip}
        accessibilityRole="button"
        accessibilityLabel={`Pay ${label}. ${editable ? "Change" : ""}`}
      >
        <Wallet size={16} color={colors.primary} />
        <Text style={styles.payChipText} numberOfLines={1}>
          Pay: <Text style={{ fontWeight: "800", color: colors.text }}>{label}</Text>
        </Text>
        {editable ? <Pencil size={15} color={colors.textMuted} /> : null}
      </Pressable>
      {open ? (
        <PayCycleSheet
          initial={shown}
          inherit={inherit}
          farm={farm}
          onClose={() => setOpen(false)}
          onSave={(c) => {
            onChange(c);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function PayCycleSheet({
  initial,
  inherit,
  farm,
  onClose,
  onSave,
}: {
  initial: PayCycle;
  inherit: boolean;
  farm: PayCycle;
  onClose: () => void;
  onSave: (c: PayCycle | null) => void;
}) {
  const [c, setC] = useState<PayCycle>(initial);
  const weekly = c.cycle === "weekly";
  function setCycle(cycle: PayCycle["cycle"]) {
    if (cycle === c.cycle) return;
    setC(cycle === "weekly" ? { cycle, from: 1, to: 6, toNextMonth: false } : { cycle, from: 1, to: 30, toNextMonth: false });
  }
  const invalid = !weekly && !c.toNextMonth && c.to < c.from;
  const days = weekly ? DAY_SHORT.map((d, i) => ({ label: d, v: i })) : Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), v: i + 1 }));
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>{inherit ? "Pay cycle for this group" : "Pay cycle for the farm"}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close"><X size={22} color={colors.textMuted} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.lg }}>
          {inherit ? (
            <Pressable onPress={() => onSave(null)} style={styles.dayRow} accessibilityRole="button">
              <Text style={styles.dayText}>Same as farm ({farm.cycle === "weekly" ? "weekly" : "monthly"} · {payCycleLabel(farm)})</Text>
            </Pressable>
          ) : null}
          <View style={styles.toggle}>
            {(["weekly", "monthly"] as const).map((k) => (
              <Pressable key={k} onPress={() => setCycle(k)} style={[styles.toggleBtn, c.cycle === k && styles.toggleOn]} accessibilityRole="button" accessibilityState={{ selected: c.cycle === k }}>
                <Text style={[styles.toggleText, c.cycle === k && styles.toggleTextOn]}>{k === "weekly" ? "Weekly" : "Monthly"}</Text>
              </Pressable>
            ))}
          </View>
          {(["from", "to"] as const).map((which) => (
            <View key={which} style={{ gap: 6 }}>
              <Text style={styles.pickTitle}>
                {which === "from" ? (weekly ? "From (first working day)" : "From date") : weekly ? "To (pay day)" : "To date (pay day)"}
              </Text>
              <View style={styles.dayGrid}>
                {days.map((d) => {
                  const on = c[which] === d.v;
                  return (
                    <Pressable
                      key={d.v}
                      onPress={() => setC({ ...c, [which]: d.v })}
                      style={[weekly ? styles.dayChipWide : styles.dayChip, on && styles.dayChipOn]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{d.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          {!weekly ? (
            <View style={styles.toggle}>
              {[false, true].map((next) => (
                <Pressable key={String(next)} onPress={() => setC({ ...c, toNextMonth: next })} style={[styles.toggleBtn, c.toNextMonth === next && styles.toggleOn]} accessibilityRole="button">
                  <Text style={[styles.toggleText, c.toNextMonth === next && styles.toggleTextOn]}>{next ? "To date in next month" : "Same month"}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Text style={[styles.sheetHint, invalid && { color: colors.danger }]}>
            {invalid
              ? "The To date is before the From date - choose \"To date in next month\"."
              : `Pay for ${payCycleLabel(c)}${weekly ? `, on ${DAY_NAMES[c.to]}` : ""}.`}
          </Text>
          <Button title="Save" onPress={() => onSave(c)} disabled={invalid} />
        </ScrollView>
      </View>
    </Modal>
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
  toggle: { flexDirection: "row", backgroundColor: colors.muted, borderRadius: radius.pill, padding: 4, gap: 4 },
  toggleBtn: { flex: 1, minHeight: 42, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  toggleOn: { backgroundColor: colors.card },
  toggleText: { fontSize: 14.5, fontWeight: "600", color: colors.textMuted, textAlign: "center" },
  toggleTextOn: { color: colors.text, fontWeight: "800" },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dayChip: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  dayChipWide: { minWidth: 48, height: 44, paddingHorizontal: 8, borderRadius: 22, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  dayChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  dayChipTextOn: { color: "#fff" },
});
