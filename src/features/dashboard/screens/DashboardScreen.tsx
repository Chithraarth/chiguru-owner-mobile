import React, { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import type { RecentAd } from "../../../types/api";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, shadow, spacing } from "../../../components/theme";
import { BigTiles, IconChip, ListCard, ListRow, Pill, SectionLabel, StatTiles, shortRupees } from "../../../components/harvest";
import { AppDrawer } from "../../../components/AppDrawer";
import { EstateSwitcherModal } from "../../estate/components/EstateSwitcherModal";
import { useSessionStore } from "../../../store/sessionStore";
import { useSyncStore } from "../../../store/syncStore";
import { HomeHeader } from "../components/HomeHeader";
import { getDashboardSummary, getRecentAds } from "../../../api/endpoints/dashboard";
import { getFarmProfile } from "../../../api/endpoints/estates";
import { getPlanTasks } from "../../../api/endpoints/yearPlan";
import { useEstateStore } from "../../estate/store/estateStore";
import { useEstates } from "../../estate/hooks/useEstates";
import { useT } from "../../../lib/i18n";

interface ToolItem {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  chipBg: string;
  chipColor: string;
  title: string;
  desc: string;
  screen: string;
  params?: Record<string, unknown>;
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
    { icon: BotMessageSquare, chipBg: "#FFF0C2", chipColor: "#8B5BD6", title: t("more.agriAdvisor"), desc: "", screen: "AgriAi" },
    // No source translation exists for this yet - Year Plan isn't in
    // chiguru-owner-web's own dictionary (it's a newer feature than that dict).
    { icon: LineChart, chipBg: "#E4EEFB", chipColor: "#5B8CD6", title: "Year Plan", desc: "", screen: "YearPlan" },
    // Same as Year Plan above - "Reports" has no source translation in
    // chiguru-owner-web's dictionary either, so this is a literal string too.
    { icon: LineChart, chipBg: "#E4EEFB", chipColor: "#5B8CD6", title: "Reports", desc: "", screen: "Reports" },
    { icon: Leaf, chipBg: "#FBF2D9", chipColor: colors.primary, title: t("more.myFarms"), desc: "", screen: "Crops" },
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
  const user = useSessionStore((s) => s.user);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const lastSyncTime = useSyncStore((s) => s.lastSyncTime);
  const [refreshing, setRefreshing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

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
  const profile = profileQuery.data;
  const summary = summaryQuery.data;
  const firstName = user?.displayName?.split(" ")[0] ?? null;
  const place = [profile?.village, profile?.district].filter(Boolean).join(", ");
  const subtitle = needsSetup ? null : [profile?.totalAcres ? `${profile.totalAcres} acres` : null, place || null].filter(Boolean).join(" · ");
  const workers = (summary?.totalJobWorkers ?? 0) + (summary?.totalContractWorkers ?? 0);

  const tiles = [
    { icon: UserCheck, title: "Attendance", sub: "Mark who came", onPress: () => navigation.navigate("WorkGroupList") },
    { icon: Camera, title: "Work update", sub: "Field photo log", onPress: () => navigation.navigate("DailyUpdateList") },
    { icon: BookOpen, title: "Accounts", sub: "Money in & out", onPress: () => navigation.navigate("FarmAccounts") },
    {
      icon: CalendarClock,
      title: "Work plan",
      sub: monthPending.length ? `${monthPending.length} task${monthPending.length === 1 ? "" : "s"} due` : "Plan the season",
      onPress: () => navigation.navigate("YearPlan"),
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <HomeHeader
          greetingName={firstName}
          farmName={needsSetup ? "Welcome to Chiguru" : profile?.farmName || "My farm"}
          subtitle={subtitle}
          badge={needsSetup ? "New here" : "My farm"}
          onMenu={() => setDrawerOpen(true)}
          onSwitch={needsSetup ? undefined : () => setSwitcherOpen(true)}
        />

        <View style={styles.body}>
          {needsSetup ? (
            <Card style={styles.setupCard}>
              <IconChip icon={Plus} index={0} size={52} />
              <Text style={styles.setupTitle}>{t("home.setupFarm")}</Text>
              <Text style={styles.setupSubtitle}>{t("home.setupFarmSub")}</Text>
              <Button title="Create my farm" icon={Plus} onPress={() => navigation.navigate("Onboarding")} />
              <Button title="View subscription plans" variant="secondary" onPress={() => navigation.navigate("Subscription")} />
            </Card>
          ) : (
            <StatTiles
              items={[
                { label: "Workers", value: String(workers), sub: "on the farm" },
                { label: "Wages today", value: shortRupees(summary?.todayLabourCost), sub: "labour cost" },
                { label: "Spent", value: shortRupees(summary?.totalExpensesThisMonth), sub: "this month" },
              ]}
            />
          )}

          <View style={styles.sectionRow}>
            <SectionLabel>Today’s work</SectionLabel>
            {pendingCount > 0 ? (
              <Pill text={`${pendingCount} waiting to sync`} tone="warn" />
            ) : lastSyncTime ? (
              <Pill text={`Synced ${formatTime(lastSyncTime)}`} tone="good" />
            ) : null}
          </View>
          <BigTiles items={tiles} />

          <Pressable
            style={({ pressed }) => [styles.moreToggle, pressed && { opacity: 0.8 }]}
            onPress={() => setMoreOpen((o) => !o)}
            accessibilityRole="button"
          >
            <Text style={styles.moreText}>{moreOpen ? "Fewer tools" : "More tools"}</Text>
            {moreOpen ? <ChevronUp size={18} color={colors.primary} /> : <ChevronDown size={18} color={colors.primary} />}
          </Pressable>
          {moreOpen ? (
            <BigTiles
              columns={3}
              items={moreTools(t).map((m) => ({ icon: m.icon, title: m.title, onPress: () => navigation.navigate(m.screen, m.params) }))}
            />
          ) : null}

          {!needsSetup && monthPending.length > 0 ? (
            <Pressable style={({ pressed }) => [styles.planCard, pressed && { opacity: 0.9 }]} onPress={() => navigation.navigate("YearPlan")}>
              <View style={styles.planHead}>
                <IconChip icon={CalendarClock} index={2} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>This month’s plan</Text>
                  <Text style={styles.planSubtitle}>
                    {monthPending.length} task{monthPending.length === 1 ? "" : "s"} pending
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </View>
              {monthPending.slice(0, 3).map((task) => (
                <View key={task.id} style={styles.planRow}>
                  <View style={styles.planCheckbox} />
                  <Text style={styles.planTaskText} numberOfLines={1}>
                    {task.title}
                  </Text>
                </View>
              ))}
            </Pressable>
          ) : null}

          <View style={styles.sectionRow}>
            <SectionLabel>{t("home.recentAds")}</SectionLabel>
            <Text style={styles.marketLink} onPress={() => navigation.navigate("Mandi")}>
              Mandi prices
            </Text>
          </View>
          {(adsQuery.data?.length ?? 0) === 0 ? (
            <Card style={{ alignItems: "center", gap: spacing.sm }}>
              <Text style={styles.mutedCenter}>{t("home.noAdsYet")}</Text>
              <Button title="Post an ad" variant="light" icon={Plus} onPress={() => navigation.navigate("Shop")} />
            </Card>
          ) : (
            <ListCard>
              {adsQuery.data?.map((ad, i, all) => {
                const style = AD_BOARD_STYLE[ad.board] ?? AD_BOARD_STYLE.produce;
                return (
                  <ListRow
                    key={ad.id}
                    title={ad.title}
                    subtitle={ad.place ? `${ad.place} · ${timeAgo(ad.createdAt)}` : timeAgo(ad.createdAt)}
                    left={<IconChip icon={style.icon} index={i} />}
                    right={<ChevronRight size={18} color={colors.textMuted} />}
                    divider={i < all.length - 1}
                    onPress={() => navigation.navigate(style.screen, style.params)}
                  />
                );
              })}
            </ListCard>
          )}
        </View>
      </ScrollView>

      <AppDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
        onSwitchFarm={() => setSwitcherOpen(true)}
      />
      <EstateSwitcherModal
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        onAddFarm={() => navigation.navigate("Onboarding")}
      />
    </View>
  );
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  setupCard: { alignItems: "flex-start", gap: spacing.sm, padding: 20 },
  setupTitle: { fontSize: 22, fontWeight: "800", color: colors.text },
  setupSubtitle: { fontSize: 15.5, color: colors.textMuted, marginBottom: spacing.xs },
  moreToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  moreText: { fontSize: 16, fontWeight: "800", color: colors.primary },
  planCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, gap: 10, ...shadow },
  planHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  planTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  planSubtitle: { fontSize: 14, color: colors.textMuted },
  planRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 4 },
  planCheckbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.primary },
  planTaskText: { fontSize: 15.5, color: colors.text, flexShrink: 1 },
  marketLink: { color: colors.primary, fontWeight: "800", fontSize: 15 },
  mutedCenter: { color: colors.textMuted, fontSize: 15 },
});
