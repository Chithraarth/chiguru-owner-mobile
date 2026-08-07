import React, { useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { NoEstateNotice } from "../../../components/NoEstateNotice";
import { colors, spacing } from "../../../components/theme";
import { useSprays } from "../hooks/useSprays";
import { useEstateStore } from "../../estate/store/estateStore";
import { useT } from "../../../lib/i18n";
import type { Spray } from "../../../types/api";

export function SpraysScreen({ navigation }: { navigation: any }) {
  const { t } = useT();
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const { data, isLoading, refetch, deleteSpray } = useSprays();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  if (activeEstateId == null) return <NoEstateNotice />;

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function confirmDelete(spray: Spray) {
    Alert.alert("Delete spray record?", undefined, [
      { text: t("scan.cancel"), style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteSpray.mutate(spray.id) },
    ]);
  }

  if (isLoading) return <LoadingView label="Loading sprays..." />;

  return (
    <View style={styles.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState title="No spray records yet" subtitle="Log fertilizer/pesticide applications here." />}
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.productName}</Text>
              <Text style={styles.meta}>
                {item.date}
                {item.cropName ? ` · ${item.cropName}` : ""}
                {item.cost ? ` · ₹${item.cost}` : ""}
              </Text>
            </View>
            <Pressable onPress={() => confirmDelete(item)} hitSlop={10}>
              <Text style={styles.delete}>Delete</Text>
            </Pressable>
          </Card>
        )}
      />
      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
        <Button title="+ Log spray" onPress={() => navigation.navigate("SprayForm")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  delete: { color: colors.danger, fontSize: 13 },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
