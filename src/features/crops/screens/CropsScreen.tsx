import React, { useMemo, useState, useLayoutEffect } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { Plus, Trash2, Leaf, Sprout } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../../../components/Card";
import { HeaderAddButton, IconChip, Pill } from "../../../components/harvest";
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderAddButton label={t("estate.addCrop")} onPress={() => navigation.navigate("CropForm")} />,
    });
  });

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
        <Button title="Create New Estate" icon={Plus} onPress={() => navigation.navigate("Onboarding")} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <Text style={styles.sectionLabel}>Your farms</Text>
            {estates.map((e) => (
              <Pressable key={e.id} onPress={() => estatesQuery.switchEstate(e.id)}>
                <Card style={[styles.estateRow, e.id === activeEstateId && styles.estateRowActive]}>
                  <IconChip icon={Leaf} index={1} size={42} />
                  <Text style={styles.estateName}>{e.farmName}</Text>
                  {e.id === activeEstateId ? <Pill text={t("estate.active")} tone="good" /> : null}
                </Card>
              </Pressable>
            ))}
            <View style={{ height: spacing.sm }} />
            <Button
              title="Create New Estate" icon={Plus}
              variant="light"
              onPress={() => navigation.navigate("Onboarding")}
            />
            <View style={{ height: spacing.md }} />
            <Text style={styles.sectionLabel}>Crops on this farm</Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <LoadingView label="Loading crops..." />
          ) : (
            <EmptyState title="No crops yet" subtitle="Add a crop to start tracking sprays and harvests." />
          )
        }
        renderItem={({ item, index }) => {
          const isMergeTarget = mergeSource != null && mergeSource.id !== item.id;
          return (
            <Pressable
              onPress={() =>
                isMergeTarget ? confirmMerge(item) : navigation.navigate("CropForm", { crop: item })
              }
            >
              <Card style={[styles.row, isMergeTarget && styles.mergeTargetRow]}>
                <IconChip icon={Sprout} index={index} size={46} />
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
                    <Trash2 size={18} color={colors.danger} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionLabel: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
  estateRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: spacing.sm, borderWidth: 3, borderColor: "transparent" },
  estateRowActive: { borderColor: colors.primary },
  estateName: { flex: 1, fontSize: 17, fontWeight: "800", color: colors.text, textTransform: "capitalize" },
  activeBadge: { fontSize: 14, color: colors.primary, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  mergeTargetRow: { borderColor: colors.primary, borderWidth: 2 },
  name: { fontSize: 18, fontWeight: "800", color: colors.text },
  meta: { fontSize: 14.5, color: colors.textMuted, marginTop: 2 },
  delete: { color: colors.danger, fontSize: 14.5 },
  dupBadge: {
    backgroundColor: colors.amberBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  dupBadgeText: { fontSize: 12.5, fontWeight: "700", color: colors.warning },
  mergeHere: { color: colors.primary, fontSize: 14.5, fontWeight: "700" },
  mergeBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.secondary,
    padding: spacing.sm + 2,
    marginHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  mergeBannerText: { flex: 1, fontSize: 14.5, color: colors.text, marginRight: spacing.sm },
  mergeCancel: { color: colors.danger, fontWeight: "700", fontSize: 14.5 },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
