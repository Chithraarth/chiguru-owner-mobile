import React, { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, TextInput } from "../../../components/Text";
import { Check, Leaf, Pencil, Plus, Trash2, Users, X } from "lucide-react-native";
import { IconChip, ListCard, ListRow, Pill, RoundButton, SectionLabel } from "../../../components/harvest";
import { Button } from "../../../components/Button";
import { colors, radius, spacing } from "../../../components/theme";
import { useEstates } from "../hooks/useEstates";
import { useMyEstates } from "../hooks/useMyEstates";
import type { Estate } from "../../../types/api";

/**
 * Bottom sheet listing "My farms" (tap to switch, rename, delete) and the
 * farms this person was invited to (tap to switch into invitee mode).
 */
export function EstateSwitcherModal({
  visible,
  onClose,
  onAddFarm,
}: {
  visible: boolean;
  onClose: () => void;
  onAddFarm?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { data: estates, activeEstateId, switchEstate, renameEstate, deleteEstate } = useEstates();
  // Farms other Owners invited this person to - opening one switches the app
  // into invitee mode (see RootNavigator), so they're listed without the
  // rename/delete actions that only apply to your own farms.
  const invited = (useMyEstates().data ?? []).filter((e) => e.relationship === "invited");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const mine = estates ?? [];

  function startEdit(e: Estate) {
    setEditingId(e.id);
    setEditValue(e.farmName);
  }

  function saveEdit() {
    if (editingId != null && editValue.trim()) {
      renameEstate.mutate({ id: editingId, farmName: editValue.trim() });
    }
    setEditingId(null);
  }

  function confirmDelete(e: Estate) {
    if (mine.length <= 1) {
      Alert.alert("Can't delete", "You need at least one farm.");
      return;
    }
    Alert.alert("Delete farm?", `"${e.farmName}" and all its records will be permanently deleted.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteEstate.mutate(e.id) },
    ]);
  }

  // Close the sheet first and act once its slide-out is done: switching to an
  // invited farm swaps the whole app (RootNavigator), and iOS freezes if
  // that happens while this modal is still on screen.
  function afterClosing(action: () => void) {
    onClose();
    setTimeout(action, 350);
  }

  function open(id: number) {
    if (id === activeEstateId) {
      onClose();
      return;
    }
    afterClosing(() => {
      switchEstate(id).catch(() => Alert.alert("Couldn't switch farm", "Please try again."));
    });
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

        <ScrollView contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">
          {mine.length > 0 ? <SectionLabel>My farms</SectionLabel> : null}
          {mine.length > 0 ? (
            <ListCard>
              {mine.map((item, i) =>
                editingId === item.id ? (
                  <View key={item.id} style={[styles.editRow, i < mine.length - 1 && styles.divider]}>
                    <TextInput style={styles.editInput} value={editValue} onChangeText={setEditValue} autoFocus onSubmitEditing={saveEdit} />
                    <Pressable onPress={saveEdit} hitSlop={8} accessibilityLabel="Save name">
                      <Check size={22} color={colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => setEditingId(null)} hitSlop={8} accessibilityLabel="Cancel">
                      <X size={22} color={colors.textMuted} />
                    </Pressable>
                  </View>
                ) : (
                  <ListRow
                    key={item.id}
                    title={item.farmName}
                    subtitle={item.id === activeEstateId ? "Working on this farm" : "Tap to open"}
                    left={<IconChip icon={Leaf} index={1} size={44} />}
                    divider={i < mine.length - 1}
                    onPress={() => open(item.id)}
                    right={
                      <View style={styles.actions}>
                        {item.id === activeEstateId ? <Check size={22} color={colors.success} strokeWidth={2.8} /> : <Pill text="Owner" tone="good" />}
                        <Pressable onPress={() => startEdit(item)} hitSlop={8} accessibilityLabel={`Rename ${item.farmName}`}>
                          <Pencil size={18} color={colors.textMuted} />
                        </Pressable>
                        <Pressable onPress={() => confirmDelete(item)} hitSlop={8} accessibilityLabel={`Delete ${item.farmName}`}>
                          <Trash2 size={18} color={colors.danger} />
                        </Pressable>
                      </View>
                    }
                  />
                ),
              )}
            </ListCard>
          ) : null}

          {invited.length > 0 ? (
            <>
              <SectionLabel>Invited to</SectionLabel>
              <ListCard>
                {invited.map((e, i) => (
                  <ListRow
                    key={e.id}
                    title={e.farmName}
                    subtitle="Helping as invitee"
                    left={<IconChip icon={Users} index={0} size={44} />}
                    right={<Pill text="Invited" tone="accent" />}
                    divider={i < invited.length - 1}
                    onPress={() => open(e.id)}
                  />
                ))}
              </ListCard>
            </>
          ) : null}

          {onAddFarm ? (
            <Button
              title="Add farm"
              variant="light"
              icon={Plus}
              onPress={() => afterClosing(onAddFarm)}
            />
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
  actions: { flexDirection: "row", alignItems: "center", gap: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  editRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 10 },
  editInput: {
    flex: 1,
    minHeight: 48,
    fontSize: 17,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
});
