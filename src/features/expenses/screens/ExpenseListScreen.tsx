import React, { useState, useLayoutEffect } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { Plus, Trash2, Receipt } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../../../components/Card";
import { HeaderAddButton, IconChip } from "../../../components/harvest";
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderAddButton label="Add expense" onPress={() => navigation.navigate("ExpenseForm")} />,
    });
  });

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
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState title="No expenses yet" subtitle="Add your first expense with a receipt photo." />}
        renderItem={({ item, index }) => (
          <Card style={styles.row}>
            <IconChip icon={Receipt} index={index} size={44} />
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
              <Trash2 size={18} color={colors.danger} />
            </Pressable>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  totalCard: { marginHorizontal: 20, marginTop: spacing.md, alignItems: "center", padding: 18 },
  totalLabel: { color: colors.textMuted, fontSize: 16, fontWeight: "700" },
  totalValue: { fontSize: 34, fontWeight: "800", color: colors.primary, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  category: { fontSize: 16.5, fontWeight: "800", color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  amount: { fontSize: 18, fontWeight: "800", color: colors.text },
  delete: { color: colors.danger, fontSize: 14.5 },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
