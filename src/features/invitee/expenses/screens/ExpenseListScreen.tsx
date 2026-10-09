import React, { useMemo, useState } from "react";
import { FlatList, Image, Modal, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "../../../../components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Plus, Receipt } from "lucide-react-native";
import { Card } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { EmptyState, LoadingView } from "../../../../components/StateViews";
import { FormFooter, IconChip } from "../../../../components/harvest";
import { colors, radius, spacing } from "../../../../components/theme";
import { useExpenses } from "../hooks/useExpenses";
import { getExpenseReceipt } from "../../api";
import { fmtMoney } from "../../currency";
import type { Expense } from "../../types";

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}
function monthLabel(key: string) {
  return new Date(key + "-01T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function ExpenseListScreen({ navigation }: { navigation: any }) {
  const { data, isLoading, refetch } = useExpenses();
  const [refreshing, setRefreshing] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<number | null>(null);
  const insets = useSafeAreaInsets();

  const expenses = data ?? [];
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      const key = monthKey(e.date);
      (map.get(key) ?? map.set(key, []).get(key)!).push(e);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [expenses]);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function viewReceipt(e: Expense) {
    if (!e.hasReceipt) return;
    setLoadingReceiptId(e.id);
    try {
      const { receiptUrl: url } = await getExpenseReceipt(e.id);
      setReceiptUrl(url);
    } finally {
      setLoadingReceiptId(null);
    }
  }

  if (isLoading) return <LoadingView label="Loading expenses..." />;

  return (
    <View style={styles.container}>
      <Card style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total spend</Text>
        <Text style={styles.totalValue}>{fmtMoney(total)}</Text>
      </Card>
      <FlatList
        data={groups}
        keyExtractor={([key]) => key}
        contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState title="No expenses yet" subtitle="Add your first expense with a receipt photo." />}
        renderItem={({ item: [key, entries] }) => {
          const subtotal = entries.reduce((s, e) => s + Number(e.amount), 0);
          return (
            <View>
              <View style={styles.monthHeader}>
                <Text style={styles.monthLabel}>{monthLabel(key)}</Text>
                <Text style={styles.monthTotal}>{fmtMoney(subtotal)}</Text>
              </View>
              <View style={{ gap: spacing.sm }}>
                {entries.map((e, i) => (
                  <Pressable key={e.id} onPress={() => viewReceipt(e)} disabled={!e.hasReceipt}>
                    <Card style={styles.row}>
                      <IconChip icon={Receipt} index={i} size={44} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.category}>{e.category}</Text>
                        <Text style={styles.meta}>
                          {e.date}
                          {e.vendor ? ` · ${e.vendor}` : ""}
                          {e.hasReceipt ? " · tap to view receipt" : ""}
                        </Text>
                        {e.description ? <Text style={styles.meta}>{e.description}</Text> : null}
                      </View>
                      <Text style={styles.amount}>{fmtMoney(Number(e.amount))}</Text>
                    </Card>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        }}
      />
      <FormFooter>
        <Button title="Add expense" icon={Plus} onPress={() => navigation.navigate("ExpenseForm")} />
      </FormFooter>

      <Modal visible={!!receiptUrl || loadingReceiptId != null} transparent animationType="fade" onRequestClose={() => setReceiptUrl(null)}>
        <View style={styles.receiptBackdrop}>
          <Pressable style={styles.receiptClose} onPress={() => setReceiptUrl(null)} hitSlop={10}>
            <X size={22} color="#fff" />
          </Pressable>
          {receiptUrl ? (
            <Image source={{ uri: receiptUrl }} style={styles.receiptImage} resizeMode="contain" />
          ) : (
            <Text style={{ color: "#fff" }}>Loading receipt...</Text>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  totalCard: { marginHorizontal: 20, marginTop: spacing.md, alignItems: "center", padding: 18 },
  totalLabel: { color: colors.textMuted, fontSize: 16, fontWeight: "700" },
  totalValue: { fontSize: 34, fontWeight: "800", color: colors.primary, marginTop: 2 },
  monthHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  monthLabel: { fontSize: 20, fontWeight: "800", color: colors.text },
  monthTotal: { fontSize: 14, fontWeight: "700", color: colors.text },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  category: { fontSize: 16.5, fontWeight: "800", color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  amount: { fontSize: 18, fontWeight: "800", color: colors.text },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  receiptBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", alignItems: "center", justifyContent: "center" },
  receiptClose: { position: "absolute", top: 50, right: 20, zIndex: 1 },
  receiptImage: { width: "90%", height: "70%" },
});
