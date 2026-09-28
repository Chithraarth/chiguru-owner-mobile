import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { UserCheck, Camera, BookOpen, CalendarClock } from "lucide-react-native";
import { Card } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { colors, radius, spacing } from "../../../../components/theme";
import { useInviteeMe } from "../../hooks/useInviteeMe";
import { useSyncStore } from "../../../../store/syncStore";
import { useMyEstates } from "../../../estate/hooks/useMyEstates";
import { useEstateStore } from "../../../estate/store/estateStore";
import { FarmSwitcherModal } from "../../FarmSwitcherModal";
import { runSync } from "../../../../lib/syncManager";
import { signOutUser } from "../../../../lib/firebase";

export function HomeScreen({ navigation }: { navigation: any }) {
  const managerMe = useInviteeMe();
  const { pendingCount, isSyncing, isOnline, lastSyncTime } = useSyncStore();
  const { data: estates } = useMyEstates();
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const activeEstate = estates?.find((e) => e.id === activeEstateId);
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  function confirmSignOut() {
    Alert.alert("Sign out?", "You'll need to sign in again to use this app.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOutUser() },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <View style={styles.headerRow}>
        <Text style={styles.farmName} onPress={() => setSwitcherOpen(true)}>
          {activeEstate?.farmName ?? "Select farm"} ▾
        </Text>
        <Text style={styles.switchFarm} onPress={() => setSwitcherOpen(true)}>
          Switch farm
        </Text>
        <Text style={styles.signOut} onPress={confirmSignOut}>
          Sign out
        </Text>
      </View>

      <Text style={styles.greeting}>Hello, {managerMe?.name ?? "Manager"} 👋</Text>
      <Text style={styles.date}>{today}</Text>
      <Text style={styles.role}>You're helping manage this farm</Text>

      {pendingCount > 0 ? (
        <Card style={styles.pendingCard}>
          <Text style={styles.pendingText}>
            {isOnline ? `Uploading (${pendingCount} item(s))` : "Waiting for network"}
          </Text>
        </Card>
      ) : (
        <Card style={styles.syncedCard}>
          <Text style={styles.syncedText}>
            {isOnline
              ? lastSyncTime
                ? `🟢 Synced at ${new Date(lastSyncTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                : "🟢 Online — all synced"
              : "🔴 Offline — your data is safe on this phone"}
          </Text>
        </Card>
      )}

      <Button
        title={`Sync now${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
        variant="secondary"
        onPress={() => runSync({ manual: true })}
        loading={isSyncing}
      />

      <View style={{ height: spacing.lg }} />

      <NavCard
        icon={UserCheck}
        title="Attendance"
        subtitle="Mark workers present today"
        onPress={() => navigation.navigate("Attendance")}
      />
      <NavCard
        icon={CalendarClock}
        title="Work Plan"
        subtitle="See the owner's schedule for this month"
        onPress={() => navigation.navigate("WorkPlan")}
      />
      <NavCard
        icon={Camera}
        title="Work Update"
        subtitle="Post a photo of today's work"
        onPress={() => navigation.navigate("WorkUpdate")}
      />
      <NavCard
        icon={BookOpen}
        title="Expenses"
        subtitle="Log an expense with a receipt"
        onPress={() => navigation.navigate("Expenses")}
      />

      <FarmSwitcherModal visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </ScrollView>
  );
}

function NavCard({
  icon: Icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.navCard}>
        <View style={styles.navIconWrap}>
          <Icon size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.navTitle}>{title}</Text>
          <Text style={styles.navSubtitle}>{subtitle}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  farmName: { fontSize: 15, fontWeight: "700", color: colors.primary },
  switchFarm: { fontSize: 13, fontWeight: "600", color: colors.primary, marginLeft: "auto", marginRight: spacing.md },
  signOut: { fontSize: 13, color: colors.danger },
  greeting: { fontSize: 22, fontWeight: "700", color: colors.text },
  date: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  role: { fontSize: 12.5, color: colors.primary, fontWeight: "600", marginTop: 2, marginBottom: spacing.md },
  pendingCard: { backgroundColor: colors.amberBg, marginBottom: spacing.sm, borderColor: colors.warning },
  pendingText: { color: colors.warning, textAlign: "center", fontWeight: "600" },
  syncedCard: { marginBottom: spacing.sm },
  syncedText: { textAlign: "center", color: colors.textMuted },
  navCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  navIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  navSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
