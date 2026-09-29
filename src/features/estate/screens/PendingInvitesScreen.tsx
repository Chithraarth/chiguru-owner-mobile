import React, { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { getMyInvites, acceptInvite, declineInvite } from "../../../api/endpoints/managers";
import type { PendingInvite } from "../../../types/api";

// ── Pending Invites ───────────────────────────────────────────────────────
// Shown right after sign-in, before Choose Estate, whenever this person has
// one or more invites addressed to their phone/email that they haven't yet
// accepted or declined. An invite gives no access at all until acted on here
// — see the backend's routes/invites.ts.
export function PendingInvitesScreen({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["my-invites"], queryFn: getMyInvites });

  const acceptMutation = useMutation({
    mutationFn: (id: number) => acceptInvite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-invites"] });
      queryClient.invalidateQueries({ queryKey: ["my-estates"] });
    },
  });
  const declineMutation = useMutation({
    mutationFn: (id: number) => declineInvite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-invites"] }),
  });

  const invites = query.data ?? [];

  const allHandled = !query.isLoading && invites.length === 0;
  useEffect(() => {
    if (allHandled) onDone();
  }, [allHandled, onDone]);

  if (query.isLoading) return <LoadingView label="Checking invites..." />;
  if (allHandled) return <LoadingView label="Loading..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Text style={styles.title}>You've been invited</Text>
      <Text style={styles.subtitle}>Accept to help manage their farm, or decline if this isn't for you.</Text>

      <View style={{ gap: spacing.sm }}>
        {invites.map((invite) => (
          <InviteCard
            key={invite.id}
            invite={invite}
            busy={
              (acceptMutation.isPending && acceptMutation.variables === invite.id) ||
              (declineMutation.isPending && declineMutation.variables === invite.id)
            }
            error={
              (acceptMutation.isError && acceptMutation.variables === invite.id) ||
              (declineMutation.isError && declineMutation.variables === invite.id)
                ? "Couldn't reach the server. Check your connection and try again."
                : null
            }
            onAccept={() => acceptMutation.mutate(invite.id)}
            onDecline={() => declineMutation.mutate(invite.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function InviteCard({
  invite,
  busy,
  error,
  onAccept,
  onDecline,
}: {
  invite: PendingInvite;
  busy: boolean;
  error: string | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Users size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>
            {invite.ownerName ?? invite.ownerEmail ?? invite.ownerPhone ?? "Someone"} invited you
          </Text>
          <Text style={styles.rowSubtitle}>
            {invite.farmName ? `To help manage "${invite.farmName}"` : "To help manage their farm"}
          </Text>
          {invite.ownerName && (invite.ownerEmail || invite.ownerPhone) ? (
            <Text style={styles.rowSubtitle}>{invite.ownerEmail ?? invite.ownerPhone}</Text>
          ) : null}
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button title="Decline" variant="secondary" onPress={onDecline} disabled={busy} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Accept" onPress={onAccept} loading={busy} disabled={busy} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13.5, color: colors.textMuted, lineHeight: 19 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  rowSubtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  error: { fontSize: 12.5, color: colors.danger },
});
