import React, { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Card } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { EmptyState, LoadingView } from "../../../../components/StateViews";
import { colors, spacing } from "../../../../components/theme";
import { useWorkGroups } from "../hooks/useAttendance";
import { fmtMoney } from "../../currency";

export function AttendanceGroupsScreen({ navigation }: { navigation: any }) {
  const { data, isLoading, refetch } = useWorkGroups();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
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
          <EmptyState title="No work groups yet" subtitle="Create a group to start marking attendance." />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate("AttendanceWorkers", { workGroupId: item.id, workGroupName: item.name })}
          >
            <Card style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.paymentType} · {fmtMoney(Number(item.rate))}
                  {item.blockName ? ` · ${item.blockName}` : ""}
                </Text>
              </View>
            </Card>
          </Pressable>
        )}
      />
      <View style={styles.footer}>
        <Button title="+ Create group" onPress={() => navigation.navigate("CreateWorkGroup")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
