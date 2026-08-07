import React from "react";
import { SectionList, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { colors, spacing } from "../../../components/theme";
import { getBin, permanentlyDelete, restoreFromBin } from "../../../api/endpoints/bin";
import { useT } from "../../../lib/i18n";

export function BinScreen() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const binQuery = useQuery({ queryKey: ["bin"], queryFn: getBin });

  const restoreMutation = useMutation({
    mutationFn: ({ type, id }: { type: "group" | "worker" | "update"; id: number }) => restoreFromBin(type, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bin"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ type, id }: { type: "group" | "worker" | "update"; id: number }) => permanentlyDelete(type, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bin"] }),
  });

  if (binQuery.isLoading) return <LoadingView label="Loading bin..." />;

  const sections = [
    { title: t("bin.groups"), type: "group" as const, data: binQuery.data?.groups ?? [] },
    { title: t("bin.workers"), type: "worker" as const, data: binQuery.data?.workers ?? [] },
    { title: t("bin.photos"), type: "update" as const, data: binQuery.data?.updates ?? [] },
  ].filter((s) => s.data.length > 0);

  return (
    <View style={styles.container}>
      {sections.length === 0 ? (
        <EmptyState title={t("bin.empty")} subtitle={t("bin.sub")} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
          renderItem={({ item, section }: any) => (
            <Card style={[styles.row, { marginBottom: spacing.sm }]}>
              <Text style={styles.name}>{item.name ?? item.description}</Text>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <Button
                  title={t("bin.restore")}
                  variant="secondary"
                  onPress={() => restoreMutation.mutate({ type: section.type, id: item.id })}
                />
                <Button
                  title={t("bin.deleteForever")}
                  variant="danger"
                  onPress={() => deleteMutation.mutate({ type: section.type, id: item.id })}
                />
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  row: { gap: spacing.sm },
  name: { fontSize: 14, color: colors.text },
});
