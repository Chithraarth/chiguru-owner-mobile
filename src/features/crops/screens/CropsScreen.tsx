import React, { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { useCrops } from "../hooks/useCrops";
import { useEstateStore } from "../../estate/store/estateStore";
import { useEstates } from "../../estate/hooks/useEstates";
import { useT } from "../../../lib/i18n";
import type { Crop } from "../../../types/api";

export function CropsScreen({ navigation }: { navigation: any }) {
  const { t } = useT();
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const estatesQuery = useEstates();
  const { data, isLoading, refetch, deleteCrop, mergeCrop } = useCrops();
  const [refreshing, setRefreshing] = useState(false);
  const [mergeSource, setMergeSource] = useState<Crop | null>(null);
  const insets = useSafeAreaInsets();

  // Duplicate crop names split totals across rows - flag them so the owner
  // can merge one into the other instead of tracking two separate crops.
  const duplicateIds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of data ?? []) counts.set(c.name.toLowerCase(), (counts.get(c.name.toLowerCase()) ?? 0) + 1);
    return new Set((data ?? []).filter((c) => (counts.get(c.name.toLowerCase()) ?? 0) > 1).map((c) => c.id));
  }, [data]);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    await estatesQuery.refetch();
    setRefreshing(false);
  }

  function confirmDelete(crop: Crop) {
    Alert.alert("Delete crop?", `"${crop.name}" will be removed.`, [
      { text: t("scan.cancel"), style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteCrop.mutate(crop.id) },
    ]);
  }

  function startMerge(crop: Crop) {
    setMergeSource(crop);
  }

  function confirmMerge(target: Crop) {
    if (!mergeSource) return;
    Alert.alert(
      "Merge crops?",
      `All records from "${mergeSource.name}" will move into "${target.name}", then "${mergeSource.name}" will be removed.`,
      [
        { text: t("scan.cancel"), style: "cancel", onPress: () => setMergeSource(null) },
        {
          text: "Merge",
          onPress: () => {
            mergeCrop.mutate({ id: mergeSource.id, intoId: target.id });
            setMergeSource(null);
          },
        },
      ]
    );
  }

  if (estatesQuery.isLoading) return <LoadingView label="Loading your farms..." />;

  const estates = estatesQuery.data ?? [];

  // No estate at all yet - this is "My Farms", so let the user create their
  // first one right here rather than showing a dead-end empty state.
  if (estates.length === 0) {
    return (
      <View style={[styles.container, { padding: spacing.md }]}>
        <EmptyState
          title="No farms yet"
          subtitle="Create your first estate to start tracking crops, sprays, and harvests."
        />
        <Button title="+ Create New Estate" onPress={() => navigation.navigate("Onboarding")} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <Text style={styles.sectionLabel}>YOUR FARMS</Text>
            {estates.map((e) => (
              <Pressable key={e.id} onPress={() => estatesQuery.switchEstate(e.id)}>
                <Card style={[styles.estateRow, e.id === activeEstateId && styles.estateRowActive]}>
                  <Text style={styles.estateName}>{e.farmName}</Text>
                  {e.id === activeEstateId ? <Text style={styles.activeBadge}>{t("estate.active")}</Text> : null}
                </Card>
              </Pressable>
            ))}
            <View style={{ height: spacing.sm }} />
            <Button
              title="+ Create New Estate"
              variant="secondary"
              onPress={() => navigation.navigate("Onboarding")}
            />
            <View style={{ height: spacing.md }} />
            <Text style={styles.sectionLabel}>CROPS ON THIS FARM</Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <LoadingView label="Loading crops..." />
          ) : (
            <EmptyState title="No crops yet" subtitle="Add a crop to start tracking sprays and harvests." />
          )
        }
        renderItem={({ item }) => {
          const isMergeTarget = mergeSource != null && mergeSource.id !== item.id;
          return (
            <Pressable
              onPress={() =>
                isMergeTarget ? confirmMerge(item) : navigation.navigate("CropForm", { crop: item })
              }
            >
              <Card style={[styles.row, isMergeTarget && styles.mergeTargetRow]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <Text style={styles.name}>{item.name}</Text>
                    {duplicateIds.has(item.id) && !mergeSource ? (
                      <Pressable onPress={() => startMerge(item)} style={styles.dupBadge} hitSlop={8}>
                        <Text style={styles.dupBadgeText}>duplicate · tap to merge</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <Text style={styles.meta}>
                    {item.variety ? `${item.variety} · ` : ""}
                    {item.acres ? `${item.acres} ${t("onb.acres")}` : ""}
                    {item.season ? ` · ${item.season}` : ""}
                    {item.blockName ? ` · ${item.blockName}` : ""}
                  </Text>
                </View>
                {isMergeTarget ? (
                  <Text style={styles.mergeHere}>Merge here</Text>
                ) : (
                  <Pressable onPress={() => confirmDelete(item)} hitSlop={10}>
                    <Text style={styles.delete}>Delete</Text>
                  </Pressable>
                )}
              </Card>
            </Pressable>
          );
        }}
      />
      {mergeSource ? (
        <View style={styles.mergeBanner}>
          <Text style={styles.mergeBannerText}>Merging "{mergeSource.name}" — tap the crop to merge into</Text>
          <Pressable onPress={() => setMergeSource(null)}>
            <Text style={styles.mergeCancel}>{t("scan.cancel")}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
        <Button title={`+ ${t("estate.addCrop")}`} onPress={() => navigation.navigate("CropForm")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  estateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  estateRowActive: { borderColor: colors.primary, borderWidth: 2 },
  estateName: { fontSize: 15, fontWeight: "600", color: colors.text },
  activeBadge: { fontSize: 12, color: colors.primary, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center" },
  mergeTargetRow: { borderColor: colors.primary, borderWidth: 2 },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  delete: { color: colors.danger, fontSize: 13 },
  dupBadge: {
    backgroundColor: colors.amberBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  dupBadgeText: { fontSize: 10.5, fontWeight: "700", color: colors.warning },
  mergeHere: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  mergeBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.secondary,
    padding: spacing.sm + 2,
    marginHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  mergeBannerText: { flex: 1, fontSize: 12.5, color: colors.text, marginRight: spacing.sm },
  mergeCancel: { color: colors.danger, fontWeight: "700", fontSize: 13 },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
