import React, { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react-native";
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
  const [open, setOpen] = useState<PayCycle["cycle"] | null>(null);
  const shown = value ?? farm;
  return (
    <>
      <View style={styles.inlineToggle}>
        {(["weekly", "monthly"] as const).map((k) => {
          const on = shown.cycle === k;
          return (
            <Pressable
              key={k}
              onPress={() => editable && setOpen(k)}
              disabled={!editable}
              style={[styles.inlineBtn, on && styles.inlineBtnOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${k === "weekly" ? "Weekly" : "Monthly"} pay${on ? `, ${payCycleLabel(shown)}` : ""}. Choose dates`}
            >
              <Text style={[styles.inlineBtnText, on && { color: "#fff" }]}>{k === "weekly" ? "Weekly" : "Monthly"}</Text>
              {on ? <Text style={styles.inlineBtnSub}>{payCycleLabel(shown)}</Text> : null}
            </Pressable>
          );
        })}
      </View>
      {open ? (
        <PayCycleSheet
          initial={shown}
          initialKind={open}
          inherit={inherit}
          farm={farm}
          onClose={() => setOpen(null)}
          onSave={(c) => {
            onChange(c);
            setOpen(null);
          }}
        />
      ) : null}
    </>
  );
}

function PayCycleSheet({
  initial,
  initialKind,
  inherit,
  farm,
  onClose,
  onSave,
}: {
  initial: PayCycle;
  initialKind: PayCycle["cycle"];
  inherit: boolean;
  farm: PayCycle;
  onClose: () => void;
  onSave: (c: PayCycle | null) => void;
}) {
  const [kind, setKind] = useState<PayCycle["cycle"] | null>(initialKind);
  const now = resolvePeriod({ kind: "cycle", anchor: todayIso() }, initial);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const step: "from" | "to" | "done" = from == null ? "from" : to == null ? "to" : "done";
  // The calendar starts on a highlighted date; tapping that same date
  // doesn't register, so "Use this date" confirms it.
  const shownDate = step === "to" && from ? from : now.from ?? todayIso();
  function pick(v: string) {
    if (step === "from") setFrom(v);
    else if (step === "to") setTo(v);
  }

  function choose(k: PayCycle["cycle"]) {
    setKind(k);
    setFrom(null);
    setTo(null);
  }
  const result: PayCycle | null =
    kind && from && to
      ? kind === "weekly"
        ? { cycle: "weekly", from: new Date(`${from}T00:00:00`).getDay(), to: new Date(`${to}T00:00:00`).getDay(), toNextMonth: false }
        : {
            cycle: "monthly",
            from: Number(from.slice(8, 10)),
            to: Number(to.slice(8, 10)),
            toNextMonth: to.slice(0, 7) !== from.slice(0, 7),
          }
      : null;
  const tooLong =
    kind && from && to
      ? kind === "weekly"
        ? daysBetween(from, to) > 6
        : monthsBetween(from, to) > 1
      : false;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>Pay cycle for this group</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close"><X size={22} color={colors.textMuted} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.lg }}>
          <Text style={styles.sheetHint}>
            Now: {initial.cycle === "weekly" ? "Weekly" : "Monthly"} · {payCycleLabel(initial)} ({now.label})
          </Text>
          {inherit ? (
            <Pressable onPress={() => onSave(null)} style={styles.dayRow} accessibilityRole="button">
              <Text style={styles.dayText}>Same as farm ({payCycleLabel(farm)})</Text>
            </Pressable>
          ) : null}
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {(["weekly", "monthly"] as const).map((k) => (
              <Pressable
                key={k}
                onPress={() => choose(k)}
                style={[styles.cycleBtn, kind === k && styles.cycleBtnOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: kind === k }}
              >
                <Text style={[styles.cycleBtnText, kind === k && { color: "#fff" }]}>{k === "weekly" ? "Weekly" : "Monthly"}</Text>
              </Pressable>
            ))}
          </View>
          {kind ? (
            <>
              <Text style={styles.pickTitle}>
                {step === "from" ? "Tap the first day of the pay period" : step === "to" ? "Now tap the pay day (last day)" : "Pay period chosen"}
              </Text>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <Pressable onPress={() => { setFrom(null); setTo(null); }} style={[styles.dateField, step === "from" && styles.dateFieldOn]} accessibilityRole="button">
                  <Text style={styles.fieldLabel}>From</Text>
                  <Text style={styles.fieldValue}>{from ? fmt(from, true) : "Tap a date"}</Text>
                </Pressable>
                <Pressable onPress={() => from && setTo(null)} style={[styles.dateField, step === "to" && styles.dateFieldOn]} accessibilityRole="button">
                  <Text style={styles.fieldLabel}>To (pay day)</Text>
                  <Text style={styles.fieldValue}>{to ? fmt(to, true) : "Tap a date"}</Text>
                </Pressable>
              </View>
              {step !== "done" ? (
                <DateTimePicker
                  key={step}
                  value={new Date(`${shownDate}T00:00:00`)}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  minimumDate={step === "to" && from ? new Date(`${from}T00:00:00`) : undefined}
                  onChange={(event, d) => {
                    if (event.type !== "set" || !d) return;
                    pick(isoOf(d));
                  }}
                />
              ) : null}
              {step !== "done" ? (
                <Pressable onPress={() => pick(shownDate)} style={styles.useDate} accessibilityRole="button">
                  <Text style={styles.useDateText}>Use {fmt(shownDate, true)}</Text>
                </Pressable>
              ) : null}
              {result ? (
                <Text style={[styles.sheetHint, tooLong && { color: colors.danger }]}>
                  {tooLong
                    ? kind === "weekly"
                      ? "A weekly pay period can be at most 7 days."
                      : "A monthly pay period can end at most in the next month."
                    : kind === "weekly"
                      ? `Every week ${DAY_NAMES[result.from]} → ${DAY_NAMES[result.to]}, pay on ${DAY_NAMES[result.to]}.`
                      : `Every month the ${payCycleLabel(result)}.`}
                </Text>
              ) : null}
              <Button title="Save" onPress={() => result && onSave(result)} disabled={!result || tooLong} />
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86_400_000);
}
function monthsBetween(a: string, b: string) {
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
}

/** Every pay period from the first record up to now, newest first. */
export function pastPeriods(c: PayCycle, firstDate: string): { from: string; to: string; label: string; anchor: string }[] {
  const out: { from: string; to: string; label: string; anchor: string }[] = [];
  let p: Period = { kind: "cycle", anchor: todayIso() };
  for (let i = 0; i < 200; i++) {
    const r = resolvePeriod(p, c);
    if (!r.from || !r.to) break;
    out.push({ from: r.from, to: r.to, label: r.label, anchor: r.from });
    if (r.from <= firstDate) break;
    p = stepPeriod(p, -1, c);
  }
  return out;
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
  dayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayText: { fontSize: 16, fontWeight: "700", color: colors.text, flexShrink: 1 },
  dayMeta: { fontSize: 14, fontWeight: "400", color: colors.textMuted },
  toggle: { flexDirection: "row", backgroundColor: colors.muted, borderRadius: radius.pill, padding: 4, gap: 4 },
  toggleBtn: { flex: 1, minHeight: 42, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  toggleOn: { backgroundColor: colors.card },
  toggleText: { fontSize: 14.5, fontWeight: "600", color: colors.textMuted, textAlign: "center" },
  toggleTextOn: { color: colors.text, fontWeight: "800" },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cycleBtn: { flex: 1, minHeight: 64, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  cycleBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  useDate: { alignSelf: "center", minHeight: 44, paddingHorizontal: 16, justifyContent: "center" },
  useDateText: { fontSize: 15, fontWeight: "700", color: colors.primary },
  inlineToggle: { flexDirection: "row", gap: spacing.sm },
  inlineBtn: { flex: 1, minHeight: 56, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, paddingVertical: 6 },
  inlineBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  inlineBtnText: { fontSize: 16, fontWeight: "800", color: colors.text },
  inlineBtnSub: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.9)", marginTop: 1 },
  cycleBtnText: { fontSize: 17, fontWeight: "800", color: colors.text },
  dayChip: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  dayChipWide: { minWidth: 48, height: 44, paddingHorizontal: 8, borderRadius: 22, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  dayChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  dayChipTextOn: { color: "#fff" },
});
