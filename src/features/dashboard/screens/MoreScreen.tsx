import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { colors, spacing } from "../../../components/theme";
import { useT } from "../../../lib/i18n";

// label is a translation key where one exists in chiguru-owner-web's
// dictionary; plain strings (no matching source translation) stay English.
function sections(t: (k: string) => string) {
  return [
    {
      title: "Farm records",
      items: [
        { label: `🌾 ${t("more.crops")}`, screen: "Crops" },
        { label: "🧪 Sprays", screen: "Sprays" },
        { label: "📅 Year Plan", screen: "YearPlan" },
        { label: `📊 ${t("home.reports")}`, screen: "Reports" },
      ],
    },
    {
      title: "Advisory",
      items: [
        { label: `🤖 ${t("more.agriAdvisor")} (AI chat)`, screen: "AgriAi" },
        { label: `🩺 ${t("more.diseaseDetect")}`, screen: "Disease" },
        { label: `👨‍⚕️ ${t("more.agriDoctor")}`, screen: "AgriDoctor" },
      ],
    },
    {
      title: "Market",
      items: [
        { label: `🛍️ ${t("more.shop")}`, screen: "Shop" },
        { label: "📈 Mandi prices", screen: "Mandi" },
        { label: "📢 My ads", screen: "MyAds" },
      ],
    },
    {
      title: "Account",
      items: [
        { label: `👤 ${t("profile.title")}`, screen: "Profile" },
        { label: `💳 ${t("more.subscription")}`, screen: "Subscription" },
        { label: `🧑‍🤝‍🧑 ${t("more.managerDevices")}`, screen: "ManagerDevices" },
        { label: `🗑️ ${t("bin.title")}`, screen: "Bin" },
        { label: `🔄 ${t("more.syncLog")}`, screen: "SyncLog" },
        { label: `⚙️ ${t("more.settings")}`, screen: "Settings" },
        { label: "❓ Help", screen: "Help" },
      ],
    },
  ];
}

export function MoreScreen({ navigation }: { navigation: any }) {
  const { t } = useT();
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      {sections(t).map((section) => (
        <View key={section.title} style={{ marginBottom: spacing.lg }}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Card style={{ gap: spacing.sm }}>
            {section.items.map((item) => (
              <Button
                key={item.screen}
                title={item.label}
                variant="secondary"
                onPress={() => navigation.navigate(item.screen)}
              />
            ))}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.textMuted, marginBottom: spacing.sm, textTransform: "uppercase" },
});
