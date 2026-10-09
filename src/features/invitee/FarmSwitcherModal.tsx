import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../components/Text";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Leaf, Plus, Users, X } from "lucide-react-native";
import { IconChip, ListCard, ListRow, Pill, RoundButton, SectionLabel } from "../../components/harvest";
import { colors } from "../../components/theme";
import { useMyEstates } from "../estate/hooks/useMyEstates";
import { useEstateStore } from "../estate/store/estateStore";
import type { MyEstate } from "../../types/api";

// Switcher shown while working on an invited farm: every farm this person
// can open, their own and invited ones. Picking one of their own switches
// the app back to the full Owner experience (see RootNavigator).
export function FarmSwitcherModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const estates = useMyEstates().data ?? [];
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const setActiveEstate = useEstateStore((s) => s.setActiveEstate);
  const startOwnFarmSetup = useEstateStore((s) => s.startOwnFarmSetup);
  const own = estates.filter((e) => e.relationship === "own");
  const invited = estates.filter((e) => e.relationship === "invited");

  // Leaves the invited farm for the Owner app's own-farm setup (only offered
  // until this person has a farm of their own).
  async function setUpOwnFarm() {
    await startOwnFarmSetup();
    queryClient.resetQueries({ predicate: (q) => q.queryKey[0] !== "my-estates" });
    onClose();
  }

  async function choose(estate: MyEstate) {
    await setActiveEstate(estate.id);
    queryClient.resetQueries({ predicate: (q) => q.queryKey[0] !== "my-estates" });
    onClose();
  }

  function section(label: string, list: MyEstate[]) {
    if (list.length === 0) return null;
    const isOwn = list[0].relationship === "own";
    return (
      <>
        <SectionLabel>{label}</SectionLabel>
        <ListCard>
          {list.map((e, i) => (
            <ListRow
              key={e.id}
              title={e.farmName}
              subtitle={isOwn ? "Your farm" : "Helping as invitee"}
              left={<IconChip icon={isOwn ? Leaf : Users} index={isOwn ? 1 : 0} size={44} />}
              right={
                e.id === activeEstateId ? (
                  <Check size={22} color={colors.success} strokeWidth={2.8} />
                ) : (
                  <Pill text={isOwn ? "Owner" : "Invited"} tone={isOwn ? "good" : "accent"} />
                )
              }
              divider={i < list.length - 1}
              onPress={() => choose(e)}
            />
          ))}
        </ListCard>
      </>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>Switch farm</Text>
          <RoundButton icon={X} label="Close" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ gap: 12 }}>
          {section("My farms", own)}
          {section("Invited to", invited)}
          {own.length === 0 ? (
            <Pressable style={({ pressed }) => [styles.setupRow, pressed && { opacity: 0.8 }]} onPress={setUpOwnFarm} accessibilityRole="button">
              <Plus size={20} color={colors.text} strokeWidth={2.4} />
              <Text style={styles.setupText}>Set up my own farm</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: "80%",
    gap: 12,
  },
  handle: { alignSelf: "center", width: 48, height: 5, borderRadius: 3, backgroundColor: "#D8D0BC" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
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
});
