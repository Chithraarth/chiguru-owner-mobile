import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { colors, radius, spacing } from "../../components/theme";
import { useMyEstates } from "../estate/hooks/useMyEstates";
import { useEstateStore } from "../estate/store/estateStore";
import type { MyEstate } from "../../types/api";

// Switcher shown while working on an invited farm: every farm this person
// can open, their own and invited ones. Picking one of their own switches
// the app back to the full Owner experience (see RootNavigator).
export function FarmSwitcherModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
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
    return (
      <View>
        <Text style={styles.sectionLabel}>{label}</Text>
        {list.map((e) => (
          <Pressable key={e.id} style={styles.row} onPress={() => choose(e)}>
            <Text style={styles.rowText}>{e.farmName}</Text>
            {e.id === activeEstateId ? <Text style={styles.check}>✓</Text> : null}
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Switch farm</Text>
        <ScrollView>
          {section("My farms", own)}
          {section("Invited to", invited)}
          {own.length === 0 ? (
            <Pressable style={styles.setupRow} onPress={setUpOwnFarm}>
              <Text style={styles.setupText}>＋ Set up my own farm</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: "60%",
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { fontSize: 16, color: colors.text },
  check: { color: colors.primary, fontSize: 18, fontWeight: "700" },
  setupRow: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary + "12",
  },
  setupText: { fontSize: 15, fontWeight: "600", color: colors.primary },
});
