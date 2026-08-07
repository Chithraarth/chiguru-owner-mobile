import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Archive, Banknote, Camera, CalendarCheck, Landmark, Leaf, LineChart, Users } from "lucide-react-native";
import { colors, radius, spacing } from "../../../components/theme";
import { useT } from "../../../lib/i18n";

function getAccounts(t: (key: string) => string) {
  return [
    { screen: "ExpenseList", label: t("home.expenses"), icon: Banknote, chipBg: "#E9E6FB", chipColor: "#6C5DD3" },
    { screen: "Harvests", label: t("home.harvest"), icon: Leaf, chipBg: "#D5F1EE", chipColor: "#1F9E92" },
    { screen: "Reports", label: t("home.reports"), icon: LineChart, chipBg: "#F3DBF5", chipColor: "#B45BC7" },
    { screen: "LabourRecords", label: t("farmAcct.labour"), icon: Users, chipBg: "#E2E8FA", chipColor: "#4F63D2" },
    { screen: "EmployeeAttendance", label: "Employee Attendance", icon: CalendarCheck, chipBg: "#DDF3E4", chipColor: "#2E9E5B" },
    { screen: "Loans", label: t("more.loans"), icon: Landmark, chipBg: "#FBE3E8", chipColor: "#D4526E" },
    { screen: "OldLedger", label: "Old Ledger", icon: Archive, chipBg: "#F0EAE0", chipColor: "#9C7B4F" },
  ];
}

export function FarmAccountsScreen({ navigation }: { navigation: any }) {
  const { t } = useT();
  const ACCOUNTS = getAccounts(t);
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Pressable style={styles.scanHero} onPress={() => navigation.navigate("AccountsScan")}>
        <View style={styles.scanIconWrap}>
          <Camera size={26} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.scanTitle}>{t("farmAcct.scan")}</Text>
          <Text style={styles.scanSubtitle}>{t("farmAcct.scanSub")}</Text>
        </View>
      </Pressable>

      <Text style={styles.sectionLabel}>{t("farmAcct.currentRecords").toUpperCase()}</Text>

      <View style={{ gap: spacing.sm }}>
        {ACCOUNTS.map((a) => (
          <Pressable key={a.screen} style={styles.row} onPress={() => navigation.navigate(a.screen)}>
            <View style={[styles.iconWrap, { backgroundColor: a.chipBg }]}>
              <a.icon size={20} color={a.chipColor} />
            </View>
            <Text style={styles.rowLabel}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scanHero: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg },
  scanIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  scanTitle: { color: "#fff", fontSize: 17, fontWeight: "700", lineHeight: 21 },
  scanSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 12.5, marginTop: 2, lineHeight: 16 },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5 },

  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15.5, fontWeight: "700", color: colors.text },
});
