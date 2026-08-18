import React, { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  UserCheck,
  Camera,
  BookOpen,
  Leaf,
  Stethoscope,
  ScanLine,
  BotMessageSquare,
  LineChart,
  Handshake,
  Tractor,
  Users,
  ShoppingCart,
  Store,
  RefreshCw,
  CalendarClock,
  ChevronRight,
  MapPin,
} from "lucide-react-native";
import type { RecentAd } from "../../../types/api";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { getDashboardSummary, getRecentAds } from "../../../api/endpoints/dashboard";
import { getFarmProfile } from "../../../api/endpoints/estates";
import { getPlanTasks } from "../../../api/endpoints/yearPlan";
import { useEstateStore } from "../../estate/store/estateStore";
import { useEstates } from "../../estate/hooks/useEstates";
import { ToolSection, MoreGrid, type ToolItem } from "../components/ToolSection";
import { EstateCard } from "../components/EstateCard";
import { useT } from "../../../lib/i18n";

// Primary 2x2 grid, matches chiguru-owner-web's dashboard.tsx DAILY_WORK tiles
// minus "My Farms" (moved into the expandable More grid below).
function primaryTools(t: (k: string) => string): ToolItem[] {
  return [
    { icon: UserCheck, chipBg: "#E9E6FB", chipColor: "#6C5DD3", title: t("home.attendance"), desc: "Attendance & wages", screen: "WorkGroupList" },
    { icon: Camera, chipBg: "#D5F1EE", chipColor: "#1F9E92", title: t("home.workUpdates"), desc: "Field photo log", screen: "DailyUpdateList" },
    { icon: BookOpen, chipBg: "#F3DBF5", chipColor: "#B45BC7", title: t("home.farmAccounts"), desc: "Income & expenses", screen: "FarmAccounts" },
  ];
}

// Revealed by tapping "More" - matches the web app's ADVISORY + MARKET_SETUP
// tiles, condensed into one 3-column grid.
function moreTools(t: (k: string) => string): ToolItem[] {
  return [
    { icon: Tractor, chipBg: "#E4F2FB", chipColor: "#4FA8D8", title: t("more.rentMachines"), desc: "", screen: "Hire", params: { initialTab: "rental" } },
    { icon: Handshake, chipBg: "#E4F2FB", chipColor: "#4FA8D8", title: t("more.findWorkers"), desc: "", screen: "Hire", params: { initialTab: "job" } },
    { icon: ShoppingCart, chipBg: "#FBEEDD", chipColor: "#D69A4F", title: t("more.shop"), desc: "", screen: "Shop" },
    { icon: Store, chipBg: "#E0F5E9", chipColor: "#4FAE72", title: t("more.market"), desc: "", screen: "Marketplace" },
    { icon: Stethoscope, chipBg: "#E4E7FB", chipColor: "#5B6ED6", title: t("more.agriDoctor"), desc: "", screen: "AgriDoctor" },
    { icon: ScanLine, chipBg: "#FBE4E4", chipColor: "#D66B6B", title: t("more.diseaseDetect"), desc: "", screen: "Disease" },
    { icon: BotMessageSquare, chipBg: "#EDE4FB", chipColor: "#8B5BD6", title: t("more.agriAdvisor"), desc: "", screen: "AgriAi" },
    // No source translation exists for this yet - Year Plan isn't in
    // chiguru-owner-web's own dictionary (it's a newer feature than that dict).
    { icon: LineChart, chipBg: "#E4EEFB", chipColor: "#5B8CD6", title: "Year Plan", desc: "", screen: "YearPlan" },
    // Same as Year Plan above - "Reports" has no source translation in
    // chiguru-owner-web's dictionary either, so this is a literal string too.
    { icon: LineChart, chipBg: "#E4EEFB", chipColor: "#5B8CD6", title: "Reports", desc: "", screen: "Reports" },
    { icon: Leaf, chipBg: "#E3E0EC", chipColor: colors.primary, title: t("more.myFarms"), desc: "", screen: "Crops" },
    { icon: RefreshCw, chipBg: "#EAEAEA", chipColor: "#6B6B6B", title: t("more.syncLog"), desc: "", screen: "SyncLog" },
  ];
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

const AD_BOARD_STYLE: Record<RecentAd["board"], { icon: typeof Tractor; screen: string; params?: Record<string, unknown> }> = {
  hire_job: { icon: Users, screen: "Hire", params: { initialTab: "job" } },
  hire_rental: { icon: Tractor, screen: "Hire", params: { initialTab: "rental" } },
  equipment: { icon: Tractor, screen: "Equipment" },
  produce: { icon: ShoppingCart, screen: "Marketplace" },
};

export function DashboardScreen({ navigation }: { navigation: any }) {
  const { t } = useT();
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const estatesQuery = useEstates();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["farm-profile", activeEstateId],
    queryFn: getFarmProfile,
    retry: false,
    enabled: activeEstateId != null,
  });

  const hasNoEstate = (estatesQuery.data?.length ?? 0) === 0;
  const hasProfile = !!profileQuery.data || !hasNoEstate;

  const summaryQuery = useQuery({
    queryKey: ["dashboard", activeEstateId],
    queryFn: getDashboardSummary,
    enabled: hasProfile,
  });

  const adsQuery = useQuery({
    queryKey: ["recent-ads"],
    queryFn: () => getRecentAds(6),
    enabled: hasProfile,
  });

  const planQuery = useQuery({
    queryKey: ["plan-tasks", activeEstateId],
    queryFn: getPlanTasks,
    enabled: hasProfile,
  });
  const thisMonth = currentMonth();
  const monthPending = (planQuery.data ?? []).filter((t) => !t.done && t.month <= thisMonth);

  async function onRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "estates" });
    setRefreshing(false);
  }

  if (estatesQuery.isLoading) return <LoadingView label="Loading your farms..." />;

  if (!hasNoEstate && activeEstateId != null && profileQuery.isLoading) {
    return <LoadingView label="Loading dashboard..." />;
  }

  // An estate row IS the farm profile row (same table, keyed by estate id),
  // so once any estate exists there is nothing left to "set up" - never show
  // the onboarding CTA again, even if this one profile fetch hiccups.
  const needsSetup = hasNoEstate;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {needsSetup ? (
        <Card style={styles.setupCard}>
          <View style={styles.setupIconWrap}>
            <Plus size={22} color={colors.primary} />
          </View>
          <Text style={styles.setupTitle}>{t("home.setupFarm")}</Text>
          <Text style={styles.setupSubtitle}>{t("home.setupFarmSub")}</Text>
          <Button title="+ Create New Estate" onPress={() => navigation.navigate("Onboarding")} />
          <View style={{ height: spacing.sm }} />
          <Button title="View Subscription Plans" variant="secondary" onPress={() => navigation.navigate("Subscription")} />
        </Card>
      ) : (
        <EstateCard
          farmName={profileQuery.data?.farmName ?? ""}
          village={profileQuery.data?.village ?? null}
          district={profileQuery.data?.district ?? null}
          totalAcres={profileQuery.data?.totalAcres ?? null}
          cropsCount={summaryQuery.data?.totalCrops ?? 0}
          navigation={navigation}
        />
      )}

      <View style={{ marginTop: spacing.md }}>
        <ToolSection
          items={primaryTools(t)}
          navigation={navigation}
          moreOpen={moreOpen}
          onToggleMore={() => setMoreOpen((o) => !o)}
        />
        {moreOpen ? <MoreGrid items={moreTools(t)} navigation={navigation} /> : null}
      </View>

      {!needsSetup && monthPending.length > 0 ? (
        <Pressable style={styles.planCard} onPress={() => navigation.navigate("YearPlan")}>
          <View style={styles.planIconWrap}>
            <CalendarClock size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>This month's plan</Text>
            <Text style={styles.planSubtitle}>{monthPending.length} task{monthPending.length === 1 ? "" : "s"} pending</Text>
            <View style={{ marginTop: spacing.sm, gap: 6 }}>
              {monthPending.slice(0, 3).map((task) => (
                <View key={task.id} style={styles.planRow}>
                  <View style={styles.planCheckbox} />
                  <Text style={styles.planTaskText} numberOfLines={1}>{task.title}</Text>
                </View>
              ))}
            </View>
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}

      <View style={styles.recentAdsHeader}>
        <Text style={styles.sectionLabel}>{t("home.recentAds").toUpperCase()}</Text>
        <Text style={styles.marketLink} onPress={() => navigation.navigate("Mandi")}>Market</Text>
      </View>
      {(adsQuery.data?.length ?? 0) === 0 ? (
        <Card style={{ alignItems: "center" }}>
          <Text style={styles.mutedCenter}>{t("home.noAdsYet")}</Text>
          <View style={{ height: spacing.sm }} />
          <Button title="Post an ad" variant="secondary" onPress={() => navigation.navigate("Shop")} />
        </Card>
      ) : (
        adsQuery.data?.map((ad) => {
          const style = AD_BOARD_STYLE[ad.board] ?? AD_BOARD_STYLE.produce;
          const Icon = style.icon;
          return (
            <Pressable
              key={ad.id}
              style={styles.adRow}
              onPress={() => navigation.navigate(style.screen, style.params)}
            >
              <View style={styles.adIconWrap}>
                <Icon size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle} numberOfLines={1}>{ad.title}</Text>
                {ad.place ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <MapPin size={11} color={colors.textMuted} />
                    <Text style={styles.activityMeta} numberOfLines={1}>{ad.place} · {timeAgo(ad.createdAt)}</Text>
                  </View>
                ) : (
                  <Text style={styles.activityMeta}>{timeAgo(ad.createdAt)}</Text>
                )}
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  activityTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  activityMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  adRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    marginBottom: spacing.sm,
  },
  adIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },

  setupCard: {
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  setupIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  setupTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  setupSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },

  recentAdsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  marketLink: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  mutedCenter: { color: colors.textMuted, fontSize: 13 },

  planCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  planIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  planTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  planSubtitle: { fontSize: 12, color: colors.accent, fontWeight: "600", marginTop: 1 },
  planRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  planCheckbox: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  planTaskText: { fontSize: 13, color: colors.text, flexShrink: 1 },
});
