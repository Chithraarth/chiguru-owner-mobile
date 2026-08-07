import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, History, RefreshCw, WifiOff } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { colors, radius, spacing } from "../../../components/theme";
import { getSyncConflicts } from "../../../api/endpoints/syncConflicts";
import { useSyncStore } from "../../../store/syncStore";
import { runSync } from "../../../lib/syncManager";
import type { SyncConflictValue } from "../../../types/api";

function describeValue(v: SyncConflictValue | null): string {
  if (!v) return "—";
  const parts: string[] = [];
  if (v.hoursWorked != null) parts.push(`${v.hoursWorked} hrs`);
  if (v.wageAmount != null) parts.push(`₹${v.wageAmount}`);
  if (v.notes) parts.push(`"${v.notes}"`);
  return parts.length ? parts.join(" · ") : "—";
}

export function SyncLogScreen() {
  const { pendingCount, isSyncing, lastSyncTime, isOnline } = useSyncStore();
  const conflictsQuery = useQuery({ queryKey: ["sync-conflicts"], queryFn: getSyncConflicts });
  const conflicts = conflictsQuery.data ?? [];

  const statusIcon = !isOnline ? (
    <WifiOff size={18} color="#B7791F" />
  ) : isSyncing ? (
    <RefreshCw size={18} color="#3E6FB0" />
  ) : (
    <CheckCircle2 size={18} color={colors.primary} />
  );
  const statusIconBg = !isOnline ? "#FEF3C7" : isSyncing ? "#E4EEFB" : colors.bg;
  const statusTitle = !isOnline
    ? "Offline — your data is safe on this phone"
    : isSyncing
    ? "Syncing your saved changes…"
    : pendingCount > 0
    ? `Waiting for network (${pendingCount} items)`
    : "All changes synced";
  const statusSubtitle = lastSyncTime
    ? `Last synced at ${new Date(lastSyncTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · ${new Date(lastSyncTime).toLocaleDateString()}`
    : "Not synced yet on this device";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
          <View style={[styles.statusIconWrap, { backgroundColor: statusIconBg }]}>{statusIcon}</View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>{statusTitle}</Text>
            <Text style={styles.statusSubtitle}>{statusSubtitle}</Text>
          </View>
        </View>

        {pendingCount > 0 ? (
          <View style={styles.pendingBox}>
            <Text style={styles.pendingText}>
              {pendingCount} change{pendingCount === 1 ? "" : "s"} saved on this phone, not yet uploaded.{" "}
              {isOnline ? "Uploading automatically…" : "Will upload when internet returns."}
            </Text>
          </View>
        ) : null}

        {isOnline ? (
          <View style={{ marginTop: spacing.sm }}>
            <Button title="Sync now" variant="secondary" onPress={() => runSync({ manual: true })} loading={isSyncing} />
          </View>
        ) : null}
      </Card>

      <View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.xs }}>
          <History size={15} color={colors.textMuted} />
          <Text style={styles.sectionTitle}>Conflict log</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          When two devices change the same record, the latest value is kept (last write wins). Every change is
          recorded here so nothing is lost silently.
        </Text>
      </View>

      {conflictsQuery.isLoading ? (
        <Card style={{ alignItems: "center", paddingVertical: spacing.xl }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Loading…</Text>
        </Card>
      ) : conflictsQuery.isError ? (
        <Card style={{ alignItems: "center", paddingVertical: spacing.lg, borderColor: "#FDE68A" }}>
          <WifiOff size={28} color="#D9A441" />
          <Text style={styles.emptyTitle}>Couldn't load the log</Text>
          <Text style={styles.emptySubtitle}>
            {isOnline ? "Something went wrong. Try again in a moment." : "You're offline. The conflict log will load when internet returns."}
          </Text>
        </Card>
      ) : conflicts.length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: spacing.lg }}>
          <CheckCircle2 size={28} color="#1F9E5C" />
          <Text style={styles.emptyTitle}>No conflicts</Text>
          <Text style={styles.emptySubtitle}>No two devices have changed the same record differently.</Text>
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {conflicts.map((c) => (
            <Card key={c.id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
                <Text style={styles.conflictSummary}>{c.summary}</Text>
                <Text style={styles.conflictDate}>
                  {new Date(c.createdAt).toLocaleDateString()}{" "}
                  {new Date(c.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </Text>
              </View>
              {c.workGroupName ? (
                <View style={styles.groupBadge}>
                  <Text style={styles.groupBadgeText}>{c.workGroupName}</Text>
                </View>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm }}>
                <View style={[styles.valueBox, { backgroundColor: colors.muted }]}>
                  <Text style={styles.valueLabel}>Replaced{c.previousDevice ? ` · ${c.previousDevice}` : ""}</Text>
                  <Text style={styles.valueTextOld}>{describeValue(c.previousValue)}</Text>
                </View>
                <ArrowRight size={14} color={colors.border} />
                <View style={[styles.valueBox, { backgroundColor: "#DCF5E6" }]}>
                  <Text style={[styles.valueLabel, { color: "#1F9E5C" }]}>Kept{c.newDevice ? ` · ${c.newDevice}` : ""}</Text>
                  <Text style={styles.valueTextNew}>{describeValue(c.newValue)}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  statusIconWrap: { width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  statusTitle: { fontSize: 13.5, fontWeight: "700", color: colors.text },
  statusSubtitle: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  pendingBox: { backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A", borderRadius: radius.sm, padding: spacing.sm + 2, marginTop: spacing.sm },
  pendingText: { fontSize: 11.5, color: "#92600E", lineHeight: 16 },

  sectionTitle: { fontSize: 13.5, fontWeight: "700", color: colors.text },
  sectionSubtitle: { fontSize: 11.5, color: colors.textMuted, lineHeight: 16 },

  emptyTitle: { fontSize: 13.5, fontWeight: "600", color: colors.text, marginTop: spacing.sm },
  emptySubtitle: { fontSize: 11.5, color: colors.textMuted, marginTop: 2, textAlign: "center" },

  conflictSummary: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.text, lineHeight: 18 },
  conflictDate: { fontSize: 9.5, color: colors.textMuted },
  groupBadge: { alignSelf: "flex-start", backgroundColor: "#E4EEFB", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, marginTop: spacing.xs },
  groupBadgeText: { fontSize: 10.5, fontWeight: "600", color: "#3E6FB0" },
  valueBox: { flex: 1, borderRadius: radius.sm, padding: spacing.xs + 2 },
  valueLabel: { fontSize: 9.5, color: colors.textMuted, marginBottom: 1 },
  valueTextOld: { fontSize: 11.5, color: colors.textMuted, textDecorationLine: "line-through" },
  valueTextNew: { fontSize: 11.5, color: "#1F9E5C", fontWeight: "600" },
});
