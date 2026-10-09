import React, { useLayoutEffect, useState } from "react";
import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { Camera, Trash2 } from "lucide-react-native";
import { HeaderAddButton, IconChip, Pill } from "../../../components/harvest";
import { Enter } from "../../../components/motion";
import { Card } from "../../../components/Card";
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
  const { t } = useT();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderAddButton label="Post work update" onPress={() => navigation.navigate("DailyUpdateForm")} />,
    });
  }, [navigation]);

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
        contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            title="No updates today"
            subtitle="Post a photo of today's work to keep a record."
            actionLabel="Post work update"
            onAction={() => navigation.navigate("DailyUpdateForm")}
          />
        }
        renderItem={({ item, index }) => (
          <Enter delay={Math.min(index, 6) * 80}>
            <Card style={styles.card}>
              {item.photoUrl ? (
                <View>
                  <Image source={{ uri: item.photoUrl }} style={styles.photo} />
                  {item.attendanceCount != null ? (
                    <Pill text={`${item.attendanceCount} workers counted`} tone="on" style={styles.photoBadge} />
                  ) : null}
                </View>
              ) : null}
              <View style={styles.row}>
                {item.photoUrl ? null : <IconChip icon={Camera} index={index} size={44} />}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.desc}>{item.description}</Text>
                  <Text style={styles.meta}>
                    {[item.blockName, item.date, !item.photoUrl && item.attendanceCount != null ? `${item.attendanceCount} workers` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                <Pressable onPress={() => confirmDelete(item.id)} hitSlop={10} accessibilityLabel="Delete update">
                  <Trash2 size={18} color={colors.danger} />
                </Pressable>
              </View>
            </Card>
          </Enter>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  pendingBanner: { backgroundColor: colors.amberBg, padding: spacing.sm },
  pendingText: { color: colors.warning, textAlign: "center", fontSize: 14, fontWeight: "700" },
  card: { gap: 12, padding: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4 },
  photo: { width: "100%", height: 170, borderRadius: 22, backgroundColor: colors.muted },
  photoBadge: { position: "absolute", left: 10, bottom: 10 },
  desc: { fontSize: 17, fontWeight: "800", color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
});
