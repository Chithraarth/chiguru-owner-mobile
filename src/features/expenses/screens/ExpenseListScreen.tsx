import React, { useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { NoEstateNotice } from "../../../components/NoEstateNotice";
import { colors, spacing } from "../../../components/theme";
import { useExpenses } from "../hooks/useExpenses";
import { useEstateStore } from "../../estate/store/estateStore";
import { useT } from "../../../lib/i18n";

export function ExpenseListScreen({ navigation }: { navigation: any }) {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const { data, isLoading, refetch, deleteExpense } = useExpenses();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const { t } = useT();

  if (activeEstateId == null) return <NoEstateNotice />;

  const total = (data ?? []).reduce((sum, e) => sum + Number(e.amount), 0);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function confirmDelete(id: number) {
    Alert.alert("Delete expense?", undefined, [
      { text: t("scan.cancel"), style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteExpense.mutate(id) },
    ]);
  }

  if (isLoading) return <LoadingView label="Loading expenses..." />;

  return (
    <View style={styles.container}>
      <Card style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total spend</Text>
        <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
      </Card>
      <FlatList
        data={data ?? []}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState title="No expenses yet" subtitle="Add your first expense with a receipt photo." />}
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.meta}>
                {item.date}
                {item.vendor ? ` · ${item.vendor}` : ""}
              </Text>
              {item.description ? <Text style={styles.meta}>{item.description}</Text> : null}
            </View>
            <Text style={styles.amount}>₹{item.amount}</Text>
            <Pressable onPress={() => confirmDelete(item.id)} hitSlop={10}>
              <Text style={styles.delete}>Delete</Text>
            </Pressable>
          </Card>
        )}
      />
      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
        <Button title="+ Add expense" onPress={() => navigation.navigate("ExpenseForm")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  totalCard: { margin: spacing.md, alignItems: "center" },
  totalLabel: { color: colors.textMuted, fontSize: 13 },
  totalValue: { fontSize: 24, fontWeight: "700", color: colors.primaryDark, marginTop: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  category: { fontSize: 14, fontWeight: "600", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: "700", color: colors.text },
  delete: { color: colors.danger, fontSize: 13 },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
