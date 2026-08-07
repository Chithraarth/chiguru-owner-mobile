import React, { useState } from "react";
import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { NoEstateNotice } from "../../../components/NoEstateNotice";
import { colors, spacing } from "../../../components/theme";
import { useEstateUpdates } from "../hooks/useEstateUpdates";
import { useEstateStore } from "../../estate/store/estateStore";
import { useSyncStore } from "../../../store/syncStore";
import { useT } from "../../../lib/i18n";

export function DailyUpdateListScreen({ navigation }: { navigation: any }) {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const { data, isLoading, refetch, deleteUpdate } = useEstateUpdates();
  const [refreshing, setRefreshing] = useState(false);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const insets = useSafeAreaInsets();
  const { t } = useT();

  if (activeEstateId == null) return <NoEstateNotice />;

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function confirmDelete(id: number) {
    Alert.alert("Delete this update?", undefined, [
      { text: t("scan.cancel"), style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteUpdate.mutate(id) },
    ]);
  }

  if (isLoading) return <LoadingView label="Loading updates..." />;

  return (
    <View style={styles.container}>
      {pendingCount > 0 ? (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingText}>{pendingCount} update(s) waiting to sync</Text>
        </View>
      ) : null}
      <FlatList
        data={data ?? []}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState title="No updates today" subtitle="Post a photo of today's work to keep a record." />
        }
        renderItem={({ item }) => (
          <Card style={styles.row}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.thumb} />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.desc}>{item.description}</Text>
              {item.blockName ? <Text style={styles.meta}>{item.blockName}</Text> : null}
              {item.attendanceCount != null ? (
                <Text style={styles.meta}>{item.attendanceCount} workers</Text>
              ) : null}
            </View>
            <Pressable onPress={() => confirmDelete(item.id)} hitSlop={10}>
              <Text style={styles.delete}>Delete</Text>
            </Pressable>
          </Card>
        )}
      />
      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
        <Button title="+ Post work update" onPress={() => navigation.navigate("DailyUpdateForm")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  pendingBanner: { backgroundColor: colors.amberBg, padding: spacing.sm },
  pendingText: { color: colors.warning, textAlign: "center", fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  desc: { fontSize: 14, color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  delete: { color: colors.danger, fontSize: 13 },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
