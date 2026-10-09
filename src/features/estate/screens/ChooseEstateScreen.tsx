import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, Leaf, Plus, Users } from "lucide-react-native";
import { Text } from "../../../components/Text";
import { Button } from "../../../components/Button";
import { HeaderBand } from "../../../components/HarvestHeader";
import { IconChip, Pill, SectionLabel } from "../../../components/harvest";
import { Enter } from "../../../components/motion";
import { SplashView } from "../../intro/SplashView";
import { colors, radius, shadow } from "../../../components/theme";
import { useMyEstates } from "../hooks/useMyEstates";
import { useEstateStore } from "../store/estateStore";
import { useSessionStore } from "../../../store/sessionStore";
import type { MyEstate } from "../../../types/api";

// ── Choose Estate ─────────────────────────────────────────────────────────
// Shown right after sign-in whenever this person has more than one farm, or
// any farm they've been invited to help manage — their own farm(s) open the
// full Owner app, an invited one opens the invitee screens. Picking one sets activeEstateId,
// which the API client already sends as X-Estate-Id on every request; the
// backend resolves who that makes this person (owner or invitee) from that
// header alone, so nothing else needs to happen here.
export function ChooseEstateScreen({ onChosen }: { onChosen: () => void }) {
  const insets = useSafeAreaInsets();
  const query = useMyEstates();
  const setActiveEstate = useEstateStore((s) => s.setActiveEstate);
  const startOwnFarmSetup = useEstateStore((s) => s.startOwnFarmSetup);
  const user = useSessionStore((s) => s.user);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (query.isLoading) return <SplashView label="Loading your farms…" />;

  const estates = query.data ?? [];
  const own = estates.filter((e) => e.relationship === "own");
  const invited = estates.filter((e) => e.relationship === "invited");
  const selected = estates.find((e) => e.id === selectedId) ?? estates[0];
  const firstName = user?.displayName?.split(" ")[0];

  async function choose(estate: MyEstate) {
    await setActiveEstate(estate.id);
    onChosen();
  }

  let n = 0;
  const card = (estate: MyEstate) => (
    <Enter key={estate.id} kind="pop" delay={450 + n++ * 130} style={styles.cell}>
      <FarmCard estate={estate} selected={estate.id === selected?.id} onPress={() => setSelectedId(estate.id)} />
    </Enter>
  );

  return (
    <View style={styles.container}>
      <Enter kind="down">
        <HeaderBand title="Choose a farm" subtitle={firstName ? `नमस्कार, ${firstName}` : "नमस्कार"} />
      </Enter>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 120 }}>
        <Enter delay={300}>
          <Text style={styles.subtitle}>Pick which farm to work on. You can switch any time.</Text>
        </Enter>
        {own.length > 0 && invited.length > 0 ? <SectionLabel>My farms</SectionLabel> : null}
        <View style={styles.grid}>{own.map(card)}</View>
        {invited.length > 0 && own.length > 0 ? <SectionLabel>Invited to</SectionLabel> : null}
        <View style={styles.grid}>{invited.map(card)}</View>

        {own.length === 0 ? (
          <Enter delay={700}>
            <Pressable style={({ pressed }) => [styles.setupRow, pressed && { opacity: 0.8 }]} onPress={startOwnFarmSetup} accessibilityRole="button">
              <Plus size={20} color={colors.text} strokeWidth={2.4} />
              <Text style={styles.setupText}>Set up my own farm</Text>
            </Pressable>
          </Enter>
        ) : null}
      </ScrollView>

      {selected ? (
        <Enter delay={800} style={[styles.cta, { paddingBottom: insets.bottom + 20 }]}>
          <Button title={`Continue to ${selected.farmName}`} icon={ArrowRight} onPress={() => choose(selected)} />
        </Enter>
      ) : null}
    </View>
  );
}

function FarmCard({ estate, selected, onPress }: { estate: MyEstate; selected: boolean; onPress: () => void }) {
  const own = estate.relationship === "own";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={styles.cardTop}>
        <IconChip icon={own ? Leaf : Users} index={own ? 1 : 0} size={52} />
        <Pill text={own ? "Owner" : "Invited"} tone={own ? "good" : "accent"} />
      </View>
      <Text style={styles.cardName} numberOfLines={2}>
        {estate.farmName}
      </Text>
      <Text style={styles.cardMeta}>{own ? "Your farm" : "Helping as invitee"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  subtitle: { fontSize: 16.5, color: colors.textMuted, lineHeight: 24 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  cell: { width: "48%" },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: "transparent",
    padding: 16,
    gap: 10,
    ...shadow,
  },
  cardSelected: { borderColor: colors.primary },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardName: { fontSize: 20, fontWeight: "800", color: colors.text, textTransform: "capitalize", lineHeight: 24 },
  cardMeta: { fontSize: 14.5, color: colors.textMuted },
  setupRow: {
    minHeight: 58,
    borderRadius: 999,
    borderWidth: 2.5,
    borderStyle: "dashed",
    borderColor: colors.primary,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  setupText: { fontSize: 17, fontWeight: "800", color: colors.text },
  cta: { position: "absolute", left: 20, right: 20, bottom: 0 },
});
