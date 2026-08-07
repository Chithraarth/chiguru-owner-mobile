import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { LoadingView, EmptyState } from "../../../components/StateViews";
import { NoEstateNotice } from "../../../components/NoEstateNotice";
import { colors, radius, spacing } from "../../../components/theme";
import { getMonthlyReport, getSeasonReport, getWeeklyReport } from "../../../api/endpoints/reports";
import { useEstateStore } from "../../estate/store/estateStore";

const PIE_COLORS = ["#2d6a2d", "#4caf50", "#8bc34a", "#cddc39", "#ffc107", "#ff9800", "#ff5722", "#9c27b0", "#3f51b5"];

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
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      <View style={[styles.statBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Text style={[styles.statLabel, { color: colors.primary }]}>Income</Text>
        <Text style={[styles.statValue, { color: colors.primary }]}>{inr(income)}</Text>
      </View>
      <View style={[styles.statBox, { backgroundColor: "#FDEAEA", borderColor: "#F5C6C6" }]}>
        <Text style={[styles.statLabel, { color: colors.danger }]}>Expenses</Text>
        <Text style={[styles.statValue, { color: colors.danger }]}>{inr(expenses)}</Text>
      </View>
      <View style={[styles.statBox, net >= 0 ? { backgroundColor: "#E4EEFB", borderColor: "#C7DCF5" } : { backgroundColor: "#FFF3E6", borderColor: "#FBD9AE" }]}>
        <Text style={[styles.statLabel, { color: net >= 0 ? "#3E6FB0" : "#95530F" }]}>{netLabel}</Text>
        <Text style={[styles.statValue, { color: net >= 0 ? "#3E6FB0" : "#95530F" }]}>{inr(net)}</Text>
      </View>
    </View>
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
            <View style={[styles.bar, { height: Math.max(3, (d.expenses / max) * 110), backgroundColor: colors.danger }]} />
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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <View style={styles.tabs}>
        {(["season", "monthly", "weekly"] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "season" ? "Season P&L" : t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
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

              {seasonQuery.data.crops.map((c) => (
                <Card key={c.cropId}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <View>
                      <Text style={styles.cropName}>{c.cropName}</Text>
                      <Text style={styles.cropMeta}>{c.acres} acres · {c.totalYieldKg.toLocaleString("en-IN")} kg yield</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        {c.netProfit >= 0 ? <TrendingUp size={13} color={colors.primary} /> : <TrendingDown size={13} color={colors.danger} />}
                        <Text style={[styles.cropProfit, { color: c.netProfit >= 0 ? colors.primary : colors.danger }]}>{inr(c.netProfit)}</Text>
                      </View>
                      <Text style={styles.cropMeta}>{inr(c.profitPerAcre)}/acre</Text>
                    </View>
                  </View>
                  <View style={styles.cropStatsGrid}>
                    <Text style={styles.cropStatItem}>Income: <Text style={styles.cropStatValue}>{inr(c.totalIncome)}</Text></Text>
                    <Text style={styles.cropStatItem}>Labour: <Text style={styles.cropStatValue}>{inr(c.labourCost)}</Text></Text>
                    <Text style={styles.cropStatItem}>Fertilizer: <Text style={styles.cropStatValue}>{inr(c.fertilizerCost)}</Text></Text>
                    <Text style={styles.cropStatItem}>Spray: <Text style={styles.cropStatValue}>{inr(c.sprayCost)}</Text></Text>
                  </View>
                </Card>
              ))}
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
                            <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>{item.category}</Text>
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
                      <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 12 }}>{inr(d.income)}</Text>
                      <Text style={{ color: colors.danger, fontWeight: "600", fontSize: 12 }}>{inr(d.expenses)}</Text>
                      <Text style={{ color: d.income - d.expenses >= 0 ? "#3E6FB0" : "#95530F", fontWeight: "700", fontSize: 12 }}>
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
  container: { flex: 1, backgroundColor: colors.bg },

  tabs: { flexDirection: "row", backgroundColor: colors.muted, borderRadius: radius.sm, padding: 4, gap: 2 },
  tab: { flex: 1, paddingVertical: spacing.sm - 2, borderRadius: radius.sm - 2, alignItems: "center" },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 11.5, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: colors.primary },

  filterLabel: { fontSize: 11.5, color: colors.textMuted, marginBottom: spacing.sm },
  filterSubLabel: { fontSize: 10.5, color: colors.textMuted, marginBottom: 2 },
  dateInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2, fontSize: 13, color: colors.text },

  statBox: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm + 2 },
  statLabel: { fontSize: 10.5, fontWeight: "600" },
  statValue: { fontSize: 14, fontWeight: "700", marginTop: 2 },

  blockTitle: { fontSize: 13.5, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  bar: { width: 10, borderRadius: 3 },
  barLabel: { fontSize: 9.5, color: colors.textMuted, textAlign: "center" },

  cropName: { fontSize: 14, fontWeight: "700", color: colors.text },
  cropMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  cropProfit: { fontSize: 13.5, fontWeight: "700" },
  cropStatsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  cropStatItem: { width: "47%", fontSize: 11.5, color: colors.textMuted },
  cropStatValue: { color: colors.text, fontWeight: "600" },

  pieRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pieDot: { width: 10, height: 10, borderRadius: 5 },
  pieAmount: { fontSize: 12.5, fontWeight: "700", color: colors.text },
  piePercent: { fontSize: 10.5, color: colors.textMuted, width: 40, textAlign: "right" },

  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  weekLabel: { fontSize: 13, fontWeight: "600", color: colors.text },

  dayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayLabel: { fontSize: 13, color: colors.text, width: 90 },
});
