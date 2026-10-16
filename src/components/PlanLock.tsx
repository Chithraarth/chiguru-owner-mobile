import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Lock } from "lucide-react-native";
import { Text } from "./Text";
import { Button } from "./Button";
import { colors, spacing } from "./theme";
import { usePlanActive } from "../lib/planGate";

/** Shown instead of a paid screen when the Owner has no active plan. */
export function PlanLock({ navigation }: { navigation: any }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: spacing.xl }}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Lock size={22} color={colors.accentInk} />
        </View>
        <Text style={styles.title}>Subscribe to unlock</Text>
        <Text style={styles.subtitle}>
          This is part of the Chiguru plan. Subscribe to keep your farm records, attendance, accounts and AI tools in one place.
        </Text>
        <View style={{ alignSelf: "stretch", marginTop: spacing.sm }}>
          <Button title="See plans" onPress={() => navigation.navigate("Subscription")} />
        </View>
      </View>
    </ScrollView>
  );
}

/**
 * Wraps a screen whose data the server only serves to an active plan. Until
 * the plan status is known the screen renders normally (the server still
 * refuses, and the prompt in lib/planGate.ts explains why).
 */
export function withPlan(Screen: React.ComponentType<any>) {
  function PlanGated(props: any) {
    const active = usePlanActive();
    if (active === false) return <PlanLock navigation={props.navigation} />;
    return <Screen {...props} />;
  }
  PlanGated.displayName = `withPlan(${Screen.displayName ?? Screen.name ?? "Screen"})`;
  return PlanGated;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.accent, borderRadius: 28, padding: 22, alignItems: "center", gap: spacing.sm },
  iconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.55)", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", color: colors.accentInk, textAlign: "center" },
  subtitle: { fontSize: 15, color: colors.accentInkSoft, textAlign: "center", lineHeight: 21 },
});
