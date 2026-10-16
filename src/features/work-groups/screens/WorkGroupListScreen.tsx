import React, { useLayoutEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { useQuery } from "@tanstack/react-query";
import { Trash2, UserCheck } from "lucide-react-native";
import { HeaderAddButton, IconChip, Pill, ProgressBar } from "../../../components/harvest";
import { Enter } from "../../../components/motion";
import { Card } from "../../../components/Card";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { NoEstateNotice } from "../../../components/NoEstateNotice";
import { colors, spacing } from "../../../components/theme";
import { useWorkGroups } from "../hooks/useWorkGroups";
import { useEstateStore } from "../../estate/store/estateStore";
import { useT } from "../../../lib/i18n";
import { getAttendanceByDate } from "../../../api/endpoints/attendance";
import type { WorkGroup } from "../../../types/api";

function todayIso(): string {
  const d = new Date();
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

export function WorkGroupListScreen({ navigation }: { navigation: any }) {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const { data, isLoading, refetch, deleteWorkGroup } = useWorkGroups();
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useT();
  const today = todayIso();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderAddButton label="New work group" onPress={() => navigation.navigate("WorkGroupForm")} />,
    });
  }, [navigation]);

  // Lightweight "today's status" hint per group — one all-groups query for
  // today's date, counted client-side per workGroupId. Not a full dashboard,
  // just enough to tell at a glance which groups are done for the day.
  const { data: todayAttendance, refetch: refetchToday } = useQuery({
    queryKey: ["attendance", activeEstateId, today],
    queryFn: () => getAttendanceByDate(today),
    enabled: activeEstateId != null,
  });
  const todayCountByGroup = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of todayAttendance ?? []) {
      map.set(a.workGroupId, (map.get(a.workGroupId) ?? 0) + 1);
    }
    return map;
  }, [todayAttendance]);

  if (activeEstateId == null) return <NoEstateNotice />;

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetch(), refetchToday()]);
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
        contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            title="No work groups yet"
            subtitle="Create a work group to start marking attendance."
            actionLabel="New work group"
            onAction={() => navigation.navigate("WorkGroupForm")}
          />
        }
        renderItem={({ item, index }) => {
          const markedCount = todayCountByGroup.get(item.id) ?? 0;
          const expected = item.expectedWorkers ?? 0;
          const done = expected > 0 && markedCount >= expected;
          return (
            <Enter delay={Math.min(index, 6) * 80}>
              <Pressable
                onPress={() => navigation.navigate("Attendance", { workGroupId: item.id, workGroupName: item.name })}
                style={({ pressed }) => pressed && { transform: [{ scale: 0.98 }] }}
              >
                <Card style={styles.card}>
                  <View style={styles.row}>
                    <IconChip icon={UserCheck} index={index} size={46} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {item.blockName ? `${item.blockName} · ` : ""}₹{item.rate} {item.paymentType.toLowerCase()}
                      </Text>
                    </View>
                    <Pill
                      text={done ? "Done" : markedCount > 0 ? "Going on" : "Not started"}
                      tone={done ? "good" : markedCount > 0 ? "warn" : "neutral"}
                    />
                  </View>
                  <View style={styles.row}>
                    {expected > 0 ? <ProgressBar value={markedCount / expected} /> : <View style={{ flex: 1 }} />}
                    <Text style={styles.count}>
                      {markedCount}
                      {expected > 0 ? `/${expected}` : ""} marked today
                    </Text>
                    <Pressable onPress={() => confirmDelete(item)} hitSlop={10} accessibilityLabel={`Delete ${item.name}`}>
                      <Trash2 size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                </Card>
              </Pressable>
            </Enter>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 18, fontWeight: "800", color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted },
  count: { fontSize: 15, fontWeight: "800", color: colors.text },
});
