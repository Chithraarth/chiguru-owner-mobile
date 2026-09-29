import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, BookOpen, ScanLine } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { IconChip, ListCard, ListRow, shortRupees } from "../../../components/harvest";
import { Button } from "../../../components/Button";
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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: spacing.xl }}>
      <Text style={styles.subtitle}>Closed-year totals — income, expenses, wages, loans.</Text>
      {years.length === 0 ? (
        <EmptyState title="No past years yet" subtitle="Records from before this year will show up here once you have them." />
      ) : (
        <ListCard>
          {years.map((y, i) => {
            const net = y.totals.income - y.totals.expenses - y.totals.wages;
            return (
              <ListRow
                key={y.year}
                title={String(y.year)}
                subtitle={`Income ${shortRupees(y.totals.income)} · Spent ${shortRupees(y.totals.expenses + y.totals.wages)}`}
                left={<IconChip icon={BookOpen} index={i} size={44} />}
                right={
                  <Text style={[styles.net, net >= 0 ? styles.netPositive : styles.netNegative]}>
                    {net >= 0 ? "+" : ""}
                    {shortRupees(net)}
                  </Text>
                }
                divider={i < years.length - 1}
                onPress={() => navigation.navigate("OldLedgerDetail", { year: y.year })}
              />
            );
          })}
        </ListCard>
      )}
      <Button title="Scan an old notebook page" variant="light" icon={ScanLine} onPress={() => navigation.navigate("AccountsScan")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  subtitle: { fontSize: 14.5, color: colors.textMuted, marginBottom: spacing.xs },
  row: { flexDirection: "row", alignItems: "center" },
  year: { fontSize: 18, fontWeight: "700", color: colors.text },
  meta: { fontSize: 14.5, color: colors.textMuted, marginTop: 2 },
  net: { fontSize: 17, fontWeight: "800" },
  netPositive: { color: colors.primary },
  netNegative: { color: colors.danger },
});
