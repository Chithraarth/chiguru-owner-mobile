import React, { useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { NoEstateNotice } from "../../../components/NoEstateNotice";
import { colors, spacing } from "../../../components/theme";
import { useWorkGroups } from "../hooks/useWorkGroups";
import { useEstateStore } from "../../estate/store/estateStore";
import { useT } from "../../../lib/i18n";
import type { WorkGroup } from "../../../types/api";

export function WorkGroupListScreen({ navigation }: { navigation: any }) {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const { data, isLoading, refetch, deleteWorkGroup } = useWorkGroups();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const { t } = useT();

  if (activeEstateId == null) return <NoEstateNotice />;

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function confirmDelete(group: WorkGroup) {
    Alert.alert(
      "Delete work group?",
      `"${group.name}" — along with its attendance, advances, and photos — will move to the Recycle Bin. You can restore it any time in the next 30 days, after which it's permanently deleted.`,
      [
        { text: t("scan.cancel"), style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteWorkGroup.mutate(group.id) },
      ]
    );
  }

  if (isLoading) return <LoadingView label="Loading work groups..." />;

  return (
    <View style={styles.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={(g) => String(g.id)}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            title="No work groups yet"
            subtitle="Create a work group to start marking attendance."
          />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("Attendance", { workGroupId: item.id, workGroupName: item.name })}>
            <Card style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.paymentType} · ₹{item.rate}
                  {item.blockName ? ` · ${item.blockName}` : ""}
                </Text>
              </View>
              <Pressable onPress={() => confirmDelete(item)} hitSlop={10}>
                <Text style={styles.delete}>Delete</Text>
              </Pressable>
            </Card>
          </Pressable>
        )}
      />
      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
        <Button title="+ New work group" onPress={() => navigation.navigate("WorkGroupForm")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  delete: { color: colors.danger, fontSize: 13 },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
