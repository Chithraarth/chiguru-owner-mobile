import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { colors, spacing } from "../../../components/theme";
import { getOldLedgerYears } from "../../../api/endpoints/ledger";
import { useEstateStore } from "../../estate/store/estateStore";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function OldLedgerScreen({ navigation }: { navigation: any }) {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const query = useQuery({
    queryKey: ["old-ledger-years", activeEstateId],
    queryFn: getOldLedgerYears,
    enabled: activeEstateId != null,
  });

  if (query.isLoading) return <LoadingView label="Loading past years..." />;

  const years = query.data ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
      <Text style={styles.subtitle}>Closed-year totals — income, expenses, wages, loans.</Text>
      {years.length === 0 ? (
        <EmptyState title="No past years yet" subtitle="Records from before this year will show up here once you have them." />
      ) : (
        years.map((y) => {
          const net = y.totals.income - y.totals.expenses - y.totals.wages;
          return (
            <Pressable key={y.year} onPress={() => navigation.navigate("OldLedgerDetail", { year: y.year })}>
              <Card style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.year}>{y.year}</Text>
                  <Text style={styles.meta}>
                    Income {inr(y.totals.income)} · Expenses {inr(y.totals.expenses)} · Wages {inr(y.totals.wages)}
                  </Text>
                  <Text style={[styles.net, net >= 0 ? styles.netPositive : styles.netNegative]}>
                    Net {net >= 0 ? "+" : ""}{inr(net)}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </Card>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs },
  row: { flexDirection: "row", alignItems: "center" },
  year: { fontSize: 17, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  net: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  netPositive: { color: colors.primary },
  netNegative: { color: colors.danger },
});
