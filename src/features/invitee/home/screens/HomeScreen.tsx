import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../../components/Text";
import { UserCheck, Camera, BookOpen, CalendarClock, LogOut, RefreshCw } from "lucide-react-native";
import { Button } from "../../../../components/Button";
import { BigTiles, Pill, RoundButton, SectionLabel } from "../../../../components/harvest";
import { Enter } from "../../../../components/motion";
import { colors, spacing } from "../../../../components/theme";
import { HomeHeader } from "../../../dashboard/components/HomeHeader";
import { useInviteeMe } from "../../hooks/useInviteeMe";
import { useSyncStore } from "../../../../store/syncStore";
import { useMyEstates } from "../../../estate/hooks/useMyEstates";
import { useEstateStore } from "../../../estate/store/estateStore";
import { FarmSwitcherModal } from "../../FarmSwitcherModal";
import { runSync } from "../../../../lib/syncManager";
import { signOutUser } from "../../../../lib/firebase";

/** Home while helping on someone else's farm: only the old Manager app's four jobs. */
export function HomeScreen({ navigation }: { navigation: any }) {
  const managerMe = useInviteeMe();
  const { pendingCount, isSyncing, isOnline, lastSyncTime } = useSyncStore();
  const { data: estates } = useMyEstates();
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const activeEstate = estates?.find((e) => e.id === activeEstateId);
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  function confirmSignOut() {
    Alert.alert("Sign out?", "You'll need to sign in again to use this app.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOutUser() },
    ]);
  }

  const syncPill =
    pendingCount > 0 ? (
      <Pill text={isOnline ? `Uploading ${pendingCount}` : `${pendingCount} waiting for network`} tone="warn" />
    ) : isOnline ? (
      <Pill
        text={
          lastSyncTime
            ? `Synced ${new Date(lastSyncTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
            : "All synced"
        }
        tone="good"
      />
    ) : (
      <Pill text="Offline · saved on phone" tone="bad" />
    );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <HomeHeader
          greetingName={managerMe?.name?.split(" ")[0] ?? null}
          farmName={activeEstate?.farmName ?? "Select farm"}
          subtitle={today}
          badge="Invited farm"
          onSwitch={() => setSwitcherOpen(true)}
          right={<RoundButton icon={LogOut} label="Sign out" onPress={confirmSignOut} />}
        />

        <View style={styles.body}>
          <Enter>
            <Text style={styles.role}>You’re helping manage this farm.</Text>
          </Enter>
          <View style={styles.sectionRow}>
            <SectionLabel>Today’s work</SectionLabel>
            {syncPill}
          </View>
          <Enter delay={120}>
            <BigTiles
              items={[
                { icon: UserCheck, title: "Mark attendance", sub: "Workers present today", onPress: () => navigation.navigate("Attendance") },
                { icon: Camera, title: "Work update", sub: "Photo of today’s work", onPress: () => navigation.navigate("WorkUpdate") },
                { icon: BookOpen, title: "Expenses", sub: "Log with a receipt", onPress: () => navigation.navigate("Expenses") },
                { icon: CalendarClock, title: "Work plan", sub: "Owner’s schedule", onPress: () => navigation.navigate("WorkPlan") },
              ]}
            />
          </Enter>
          <Button
            title={`Sync now${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
            variant="light"
            icon={RefreshCw}
            onPress={() => runSync({ manual: true })}
            loading={isSyncing}
          />
        </View>
      </ScrollView>

      <FarmSwitcherModal visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  role: { fontSize: 16, color: colors.textMuted },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
