import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../../../components/Text";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Check } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { LoadingView, EmptyState } from "../../../components/StateViews";
import { NoEstateNotice } from "../../../components/NoEstateNotice";
import { StatTiles, shortRupees } from "../../../components/harvest";
import { colors, radius, shadow, spacing } from "../../../components/theme";
import { getMonthlyReport, getSeasonReport, getWeeklyReport } from "../../../api/endpoints/reports";
import { useEstateStore } from "../../estate/store/estateStore";

const PIE_COLORS = ["#2F6B1F", "#F4B400", "#9ED27B", "#FF9F80", "#9FD8EA", "#D7B8F3", "#F7B7C9", "#FFD166", "#5E9E32"];

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
function monthStr() {
  return todayIso().slice(0, 7);
}
function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}
function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function dayLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
}

type Tab = "season" | "monthly" | "weekly";

function StatRow({ income, expenses, net, netLabel = "Net P&L" }: { income: number; expenses: number; net: number; netLabel?: string }) {
  return (
    <StatTiles
      items={[
        { label: "Income", value: shortRupees(income), sub: inr(income) },
        { label: "Expenses", value: shortRupees(expenses), sub: inr(expenses) },
        { label: netLabel, value: shortRupees(net), sub: net >= 0 ? "profit" : "loss" },
      ]}
    />
  );
}

// Simple paired-bar chart built from Views - no charting library dependency.
function BarComparisonChart({ data }: { data: { label: string; income: number; expenses: number }[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expenses]));
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, height: 140 }}>
      {data.map((d) => (
        <View key={d.label} style={{ flex: 1, alignItems: "center", gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: 110 }}>
            <View style={[styles.bar, { height: Math.max(3, (d.income / max) * 110), backgroundColor: colors.primary }]} />
            <View style={[styles.bar, { height: Math.max(3, (d.expenses / max) * 110), backgroundColor: colors.accent }]} />
          </View>
          <Text style={styles.barLabel} numberOfLines={1}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <TextInput value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" style={styles.dateInput} />;
}

export function ReportsScreen() {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const [tab, setTab] = useState<Tab>("season");
  const [seasonStart, setSeasonStart] = useState(`${new Date().getFullYear()}-01-01`);
  const [seasonEnd, setSeasonEnd] = useState(`${new Date().getFullYear()}-12-31`);
  const [month, setMonth] = useState(monthStr());
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()));

  if (activeEstateId == null) return <NoEstateNotice />;

  const seasonQuery = useQuery({
    queryKey: ["reports-season", activeEstateId, seasonStart, seasonEnd],
    queryFn: () => getSeasonReport(seasonStart, seasonEnd),
    enabled: tab === "season",
  });
  const monthlyQuery = useQuery({
    queryKey: ["reports-monthly", activeEstateId, month],
    queryFn: () => getMonthlyReport(month),
    enabled: tab === "monthly",
  });
  const weeklyQuery = useQuery({
    queryKey: ["reports-weekly", activeEstateId, weekStart],
    queryFn: () => getWeeklyReport(weekStart),
    enabled: tab === "weekly",
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
      <View style={styles.chips}>
        {(["weekly", "monthly", "season"] as Tab[]).map((t) => {
          const on = tab === t;
          return (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.chip, on && styles.chipOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              {on ? <Check size={16} color={colors.text} strokeWidth={2.6} /> : null}
              <Text style={styles.chipText}>{t === "season" ? "Season" : t === "monthly" ? "Month" : "Week"}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "season" ? (
        <>
          <Card>
            <Text style={styles.filterLabel}>Date range</Text>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterSubLabel}>From</Text>
                <DateInput value={seasonStart} onChange={setSeasonStart} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterSubLabel}>To</Text>
                <DateInput value={seasonEnd} onChange={setSeasonEnd} />
              </View>
            </View>
          </Card>

          {seasonQuery.isLoading ? (
            <LoadingView label="Loading..." />
          ) : !seasonQuery.data ? (
            <EmptyState title="No data for this period" />
          ) : (
            <>
              <StatRow income={seasonQuery.data.totalIncome} expenses={seasonQuery.data.totalExpenses} net={seasonQuery.data.netProfit} />

              {seasonQuery.data.crops.length > 0 ? (
                <Card>
                  <Text style={styles.blockTitle}>Income vs Expenses by Crop</Text>
                  <BarComparisonChart
                    data={seasonQuery.data.crops.map((c) => ({ label: c.cropName, income: c.totalIncome, expenses: c.totalExpenses }))}
                  />
                </Card>
              ) : null}
            </>
          )}
        </>
      ) : null}

      {tab === "monthly" ? (
        <>
          <Card>
            <Text style={styles.filterSubLabel}>Month</Text>
            <DateInput value={month} onChange={setMonth} />
          </Card>

          {monthlyQuery.isLoading ? (
            <LoadingView label="Loading..." />
          ) : monthlyQuery.data ? (
            <>
              <StatRow income={monthlyQuery.data.totalIncome} expenses={monthlyQuery.data.totalExpenses} net={monthlyQuery.data.netProfit} netLabel="Net" />
              {monthlyQuery.data.breakdown.length > 0 ? (
                <>
                  <Card>
                    <Text style={styles.blockTitle}>Expenses by Category</Text>
                    <View style={{ gap: spacing.xs }}>
                      {monthlyQuery.data.breakdown
                        .slice()
                        .sort((a, b) => b.amount - a.amount)
                        .map((item, i) => (
                          <View key={item.category} style={styles.pieRow}>
                            <View style={[styles.pieDot, { backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }]} />
                            <Text style={{ flex: 1, fontSize: 14.5, color: colors.text }}>{item.category}</Text>
                            <Text style={styles.pieAmount}>{inr(item.amount)}</Text>
                            <Text style={styles.piePercent}>{item.percentage.toFixed(1)}%</Text>
                          </View>
                        ))}
                    </View>
                  </Card>
                </>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {tab === "weekly" ? (
        <>
          <Card style={styles.weekNav}>
            <Pressable onPress={() => setWeekStart((w) => addDays(w, -7))} hitSlop={10}>
              <ChevronLeft size={20} color={colors.textMuted} />
            </Pressable>
            <Text style={styles.weekLabel}>
              {new Date(weekStart).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} –{" "}
              {new Date(addDays(weekStart, 6)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </Text>
            <Pressable
              onPress={() => setWeekStart((w) => (addDays(w, 7) <= todayIso() ? addDays(w, 7) : w))}
              hitSlop={10}
              disabled={addDays(weekStart, 7) > todayIso()}
            >
              <ChevronRight size={20} color={addDays(weekStart, 7) > todayIso() ? colors.border : colors.textMuted} />
            </Pressable>
          </Card>

          {weeklyQuery.isLoading ? (
            <LoadingView label="Loading..." />
          ) : weeklyQuery.data ? (
            <>
              <StatRow income={weeklyQuery.data.totalIncome} expenses={weeklyQuery.data.totalExpenses} net={weeklyQuery.data.netProfit} netLabel="Net" />
              <Card>
                <Text style={styles.blockTitle}>Daily Breakdown</Text>
                <BarComparisonChart data={weeklyQuery.data.days.map((d) => ({ label: dayLabel(d.date), income: d.income, expenses: d.expenses }))} />
              </Card>
              <View style={{ gap: spacing.xs }}>
                {weeklyQuery.data.days.map((d) => (
                  <Card key={d.date} style={styles.dayRow}>
                    <Text style={styles.dayLabel}>{dayLabel(d.date)}</Text>
                    <View style={{ flexDirection: "row", gap: spacing.md }}>
                      <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 14 }}>{inr(d.income)}</Text>
                      <Text style={{ color: colors.danger, fontWeight: "600", fontSize: 14 }}>{inr(d.expenses)}</Text>
                      <Text style={{ color: d.income - d.expenses >= 0 ? colors.success : colors.danger, fontWeight: "700", fontSize: 14 }}>
                        {inr(d.income - d.expenses)}
                      </Text>
                    </View>
                  </Card>
                ))}
              </View>
            </>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { minHeight: 48, paddingHorizontal: 16, borderRadius: 999, borderWidth: 2.5, borderColor: colors.border, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", gap: 6 },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.tint },
  chipText: { fontSize: 16, fontWeight: "700", color: colors.text },
  container: { flex: 1, backgroundColor: colors.bg },

  tabs: { flexDirection: "row", backgroundColor: colors.muted, borderRadius: radius.pill, padding: 4, gap: 2 },
  tab: { flex: 1, minHeight: 44, justifyContent: "center", borderRadius: radius.pill, alignItems: "center" },
  tabActive: { backgroundColor: "#fff", ...shadow },
  tabText: { fontSize: 13.5, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: colors.text, fontWeight: "800" },

  filterLabel: { fontSize: 13.5, color: colors.textMuted, marginBottom: spacing.sm },
  filterSubLabel: { fontSize: 12.5, color: colors.textMuted, marginBottom: 2 },
  dateInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2, fontSize: 14.5, color: colors.text },

  statBox: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm + 2 },
  statLabel: { fontSize: 12.5, fontWeight: "600" },
  statValue: { fontSize: 15.5, fontWeight: "700", marginTop: 2 },

  blockTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  bar: { width: 10, borderRadius: 3 },
  barLabel: { fontSize: 11.5, color: colors.textMuted, textAlign: "center" },

  pieRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pieDot: { width: 10, height: 10, borderRadius: 5 },
  pieAmount: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  piePercent: { fontSize: 12.5, color: colors.textMuted, width: 40, textAlign: "right" },

  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  weekLabel: { fontSize: 14.5, fontWeight: "600", color: colors.text },

  dayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayLabel: { fontSize: 14.5, color: colors.text, width: 90 },
});
