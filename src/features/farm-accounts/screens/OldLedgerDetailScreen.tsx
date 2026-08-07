import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../../components/Card";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { colors, spacing } from "../../../components/theme";
import { getOldLedgerYear } from "../../../api/endpoints/ledger";
import { useEstateStore } from "../../estate/store/estateStore";

function inr(n: number | string) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function OldLedgerDetailScreen({ route }: { route: any }) {
  const year: number = route.params.year;
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const query = useQuery({
    queryKey: ["old-ledger-year", activeEstateId, year],
    queryFn: () => getOldLedgerYear(year),
    enabled: activeEstateId != null,
  });

  if (query.isLoading) return <LoadingView label={`Loading ${year}...`} />;
  const d = query.data;
  if (!d) return <EmptyState title="Could not load this year" />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <Section title="EXPENSES BY CATEGORY">
        {d.expenseCategories.length === 0 ? (
          <Text style={styles.muted}>No expenses recorded.</Text>
        ) : (
          <Card>
            {d.expenseCategories.map((c) => (
              <View key={c.category} style={styles.line}>
                <Text style={styles.lineLabel}>{c.category} ({c.count})</Text>
                <Text style={styles.lineValue}>{inr(c.total)}</Text>
              </View>
            ))}
          </Card>
        )}
      </Section>

      <Section title="WAGES BY WORK TYPE">
        {d.workTypes.length === 0 ? (
          <Text style={styles.muted}>No work recorded.</Text>
        ) : (
          <Card>
            {d.workTypes.map((w, i) => (
              <View key={i} style={styles.line}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineLabel}>{w.name}</Text>
                  <Text style={styles.lineSub}>{w.days} works · {w.workers} people</Text>
                </View>
                <Text style={styles.lineValue}>{inr(w.wages)}</Text>
              </View>
            ))}
          </Card>
        )}
      </Section>

      <Section title="PER-WORKER WAGES">
        {d.workers.length === 0 ? (
          <Text style={styles.muted}>No attendance recorded.</Text>
        ) : (
          <Card>
            {d.workers.map((w, i) => (
              <View key={i} style={styles.line}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineLabel}>{w.name}</Text>
                  <Text style={styles.lineSub}>{w.days} days</Text>
                </View>
                <Text style={styles.lineValue}>{inr(w.earned)}</Text>
              </View>
            ))}
          </Card>
        )}
      </Section>

      <Section title="HARVESTS">
        {d.harvests.length === 0 ? (
          <Text style={styles.muted}>No harvests recorded.</Text>
        ) : (
          <Card>
            {d.harvests.map((h, i) => (
              <View key={i} style={styles.line}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineLabel}>{h.cropName ?? "Crop"} · {h.date}</Text>
                  <Text style={styles.lineSub}>{h.weightKg} kg{h.buyer ? ` · ${h.buyer}` : ""}</Text>
                </View>
                <Text style={styles.lineValue}>{inr(h.totalIncome)}</Text>
              </View>
            ))}
          </Card>
        )}
      </Section>

      <Section title="PAYMENTS">
        {d.payments.length === 0 ? (
          <Text style={styles.muted}>No payments recorded.</Text>
        ) : (
          <Card>
            {d.payments.map((p, i) => (
              <View key={i} style={styles.line}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineLabel}>{p.payeeName} · {p.date}</Text>
                  <Text style={styles.lineSub}>{p.method}</Text>
                </View>
                <Text style={styles.lineValue}>{inr(p.amount)}</Text>
              </View>
            ))}
          </Card>
        )}
      </Section>

      <Section title="ADVANCES">
        {d.advances.length === 0 ? (
          <Text style={styles.muted}>No advances recorded.</Text>
        ) : (
          <Card>
            {d.advances.map((a, i) => (
              <View key={i} style={styles.line}>
                <Text style={styles.lineLabel}>{a.groupName ?? "Group"} · {a.date}</Text>
                <Text style={styles.lineValue}>{inr(a.amount)}</Text>
              </View>
            ))}
          </Card>
        )}
      </Section>

      <Section title="LOANS ISSUED">
        {d.loans.length === 0 ? (
          <Text style={styles.muted}>No loans recorded.</Text>
        ) : (
          <Card>
            {d.loans.map((l, i) => (
              <View key={i} style={styles.line}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineLabel}>{l.workerName ?? "Worker"} · {l.date}</Text>
                  <Text style={styles.lineSub}>{l.status} · repaid {inr(l.repaidAmount)} of {inr(l.totalDue)}</Text>
                </View>
                <Text style={styles.lineValue}>{inr(l.amount)}</Text>
              </View>
            ))}
          </Card>
        )}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.6, marginBottom: spacing.sm },
  muted: { fontSize: 13, color: colors.textMuted },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs + 2,
  },
  lineLabel: { fontSize: 13.5, fontWeight: "600", color: colors.text },
  lineSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  lineValue: { fontSize: 13.5, fontWeight: "700", color: colors.text },
});
