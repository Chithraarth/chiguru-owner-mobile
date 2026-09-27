import React from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Home, Users } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { useMyEstates } from "../hooks/useMyEstates";
import { useEstateStore } from "../store/estateStore";
import type { MyEstate } from "../../../types/api";

// ── Choose Estate ─────────────────────────────────────────────────────────
// Shown once, right after sign-in, whenever this person has more than one
// estate relationship to pick from — their own farm(s), and/or one or more
// farms they've been invited to help manage. Picking one sets activeEstateId,
// which the API client already sends as X-Estate-Id on every request; the
// backend resolves who that makes this person (owner or invitee) from that
// header alone, so nothing else needs to happen here.
export function ChooseEstateScreen({ onChosen }: { onChosen: () => void }) {
  const query = useMyEstates();
  const setActiveEstate = useEstateStore((s) => s.setActiveEstate);

  async function choose(estate: MyEstate) {
    await setActiveEstate(estate.id);
    onChosen();
  }

  if (query.isLoading) return <LoadingView label="Loading your farms..." />;

  const estates = query.data ?? [];
  const own = estates.filter((e) => e.relationship === "own");
  const invited = estates.filter((e) => e.relationship === "invited");

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Text style={styles.title}>Choose a farm</Text>
      <Text style={styles.subtitle}>You have access to more than one farm. Pick which one to work on.</Text>

      {own.length > 0 ? (
        <View>
          <Text style={styles.sectionLabel}>My farms</Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {own.map((estate) => (
              <EstateRow key={estate.id} estate={estate} icon={Home} onPress={() => choose(estate)} />
            ))}
          </View>
        </View>
      ) : null}

      {invited.length > 0 ? (
        <View>
          <Text style={styles.sectionLabel}>Invited to</Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {invited.map((estate) => (
              <EstateRow key={estate.id} estate={estate} icon={Users} onPress={() => choose(estate)} />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function EstateRow({
  estate,
  icon: Icon,
  onPress,
}: {
  estate: MyEstate;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.row}>
        <View style={styles.iconWrap}>
          <Icon size={18} color={colors.primary} />
        </View>
        <Text style={styles.rowText}>{estate.farmName}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13.5, color: colors.textMuted, lineHeight: 19 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { fontSize: 15.5, fontWeight: "600", color: colors.text, flex: 1 },
});
