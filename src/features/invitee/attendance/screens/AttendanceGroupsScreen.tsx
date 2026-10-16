import React, { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "../../../../components/Text";
import { ChevronRight, Plus, UserCheck } from "lucide-react-native";
import { FormFooter, IconChip } from "../../../../components/harvest";
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
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState title="No work groups yet" subtitle="Create a group to start marking attendance." />
        }
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => navigation.navigate("AttendanceWorkers", { workGroupId: item.id, workGroupName: item.name })}
            style={({ pressed }) => pressed && { transform: [{ scale: 0.98 }] }}
          >
            <Card style={styles.row}>
              <IconChip icon={UserCheck} index={index} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.paymentType} · {fmtMoney(Number(item.rate))}
                  {item.blockName ? ` · ${item.blockName}` : ""}
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </Card>
          </Pressable>
        )}
      />
      <FormFooter>
        <Button title="Create group" icon={Plus} onPress={() => navigation.navigate("CreateWorkGroup")} />
      </FormFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 18, fontWeight: "800", color: colors.text },
  meta: { fontSize: 14.5, color: colors.textMuted, marginTop: 2 },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
