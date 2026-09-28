import React, { useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Pencil, Trash2, X, Check } from "lucide-react-native";
import { colors, radius, spacing } from "../../../components/theme";
import { useEstates } from "../hooks/useEstates";
import { useMyEstates } from "../hooks/useMyEstates";
import type { Estate } from "../../../types/api";

export function EstateSwitcherModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { data: estates, activeEstateId, switchEstate, renameEstate, deleteEstate } = useEstates();
  // Farms other Owners invited this person to - opening one switches the app
  // into invitee mode (see RootNavigator), so they're listed without the
  // rename/delete actions that only apply to your own farms.
  const invited = (useMyEstates().data ?? []).filter((e) => e.relationship === "invited");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

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
    if ((estates ?? []).length <= 1) {
      Alert.alert("Can't delete", "You need at least one farm.");
      return;
    }
    Alert.alert("Delete farm?", `"${e.farmName}" and all its records will be permanently deleted.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteEstate.mutate(e.id) },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Switch farm</Text>
        <FlatList
          data={estates ?? []}
          ListFooterComponent={
            invited.length > 0 ? (
              <View>
                <Text style={styles.sectionLabel}>Invited to</Text>
                {invited.map((e) => (
                  <Pressable
                    key={e.id}
                    style={styles.row}
                    onPress={async () => {
                      await switchEstate(e.id);
                      onClose();
                    }}
                  >
                    <Text style={styles.rowText}>{e.farmName}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null
          }
          keyExtractor={(e) => String(e.id)}
          renderItem={({ item }) =>
            editingId === item.id ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.editInput}
                  value={editValue}
                  onChangeText={setEditValue}
                  autoFocus
                  onSubmitEditing={saveEdit}
                />
                <Pressable onPress={saveEdit} hitSlop={8}>
                  <Check size={18} color={colors.primary} />
                </Pressable>
                <Pressable onPress={() => setEditingId(null)} hitSlop={8}>
                  <X size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.row}>
                <Pressable
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm }}
                  onPress={async () => {
                    await switchEstate(item.id);
                    onClose();
                  }}
                >
                  <Text style={styles.rowText}>{item.farmName}</Text>
                  {item.id === activeEstateId ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
                <Pressable onPress={() => startEdit(item)} hitSlop={8} style={{ marginLeft: spacing.sm }}>
                  <Pencil size={16} color={colors.textMuted} />
                </Pressable>
                <Pressable onPress={() => confirmDelete(item)} hitSlop={8} style={{ marginLeft: spacing.md }}>
                  <Trash2 size={16} color={colors.danger} />
                </Pressable>
              </View>
            )
          }
        />
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
  title: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { fontSize: 16, color: colors.text },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: spacing.lg,
  },
  check: { color: colors.primary, fontSize: 18, fontWeight: "700" },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
});
