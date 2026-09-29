import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Text } from "../../../components/Text";
import { Archive, Banknote, Camera, CalendarCheck, ChevronRight, Landmark, Leaf, LineChart, Users } from "lucide-react-native";
import { BigTiles, SectionLabel, StatTiles, shortRupees } from "../../../components/harvest";
import { Enter } from "../../../components/motion";
import { colors, radius, spacing } from "../../../components/theme";
import { getDashboardSummary } from "../../../api/endpoints/dashboard";
import { useEstateStore } from "../../estate/store/estateStore";
import { useT } from "../../../lib/i18n";

function getAccounts(t: (key: string) => string) {
  return [
    { screen: "ExpenseList", label: t("home.expenses"), icon: Banknote, sub: "Bills & receipts" },
    { screen: "Harvests", label: t("home.harvest"), icon: Leaf, sub: "Sales & income" },
    { screen: "LabourRecords", label: t("farmAcct.labour"), icon: Users, sub: "Wages & advances" },
    { screen: "Loans", label: t("more.loans"), icon: Landmark, sub: "Given & taken" },
    { screen: "Reports", label: t("home.reports"), icon: LineChart, sub: "Season totals" },
    { screen: "EmployeeAttendance", label: "Employee Attendance", icon: CalendarCheck, sub: "Days worked" },
    { screen: "OldLedger", label: "Old Ledger", icon: Archive, sub: "Past seasons" },
  ];
}

export function FarmAccountsScreen({ navigation }: { navigation: any }) {
  const { t } = useT();
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const summary = useQuery({
    queryKey: ["dashboard", activeEstateId],
    queryFn: getDashboardSummary,
    enabled: activeEstateId != null,
  }).data;
  const income = summary?.totalIncomeThisMonth ?? 0;
  const spent = summary?.totalExpensesThisMonth ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
      {summary ? (
        <Enter>
          <StatTiles
            items={[
              { label: "Income", value: shortRupees(income), sub: "this month" },
              { label: "Spent", value: shortRupees(spent), sub: "this month" },
              { label: "Net", value: shortRupees(income - spent), sub: "this month" },
            ]}
          />
        </Enter>
      ) : null}

      <Enter delay={120}>
        <Pressable
          style={({ pressed }) => [styles.scanHero, pressed && { transform: [{ scale: 0.98 }] }]}
          onPress={() => navigation.navigate("AccountsScan")}
          accessibilityRole="button"
        >
          <View style={styles.scanIconWrap}>
            <Camera size={28} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.scanTitle}>{t("farmAcct.scan")}</Text>
            <Text style={styles.scanSubtitle}>{t("farmAcct.scanSub")}</Text>
          </View>
          <ChevronRight size={22} color={colors.accentInk} />
        </Pressable>
      </Enter>

      <SectionLabel>{t("farmAcct.currentRecords")}</SectionLabel>
      <Enter delay={240}>
        <BigTiles items={getAccounts(t).map((a) => ({ icon: a.icon, title: a.label, sub: a.sub, onPress: () => navigation.navigate(a.screen) }))} />
      </Enter>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scanHero: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.accent, borderRadius: radius.lg, padding: 18 },
  scanIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  scanTitle: { color: colors.accentInk, fontSize: 19, fontWeight: "800", lineHeight: 23 },
  scanSubtitle: { color: colors.accentInkSoft, fontSize: 14.5, marginTop: 2, lineHeight: 19 },
});
