import React, { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Users } from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { HeaderBand } from "../../../components/HarvestHeader";
import { IconChip } from "../../../components/harvest";
import { Enter } from "../../../components/motion";
import { SplashView } from "../../intro/SplashView";
import { colors, spacing } from "../../../components/theme";
import { getMyInvites, acceptInvite, declineInvite } from "../../../api/endpoints/managers";
import type { PendingInvite } from "../../../types/api";

// What an invitee can do on someone else's farm - the old Manager app's
// features (see chiguru-backend's middlewares/inviteeAccess.ts).
const CAN_DO = [
  "Mark attendance & work groups",
  "Post work updates with photos",
  "Add expenses with receipts",
  "See the owner’s work plan",
];

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

  if (query.isLoading) return <SplashView label="Checking invites…" />;
  if (allHandled) return <SplashView />;

  return (
    <View style={styles.container}>
      <Enter kind="down">
        <HeaderBand title="You’ve been invited" subtitle="Accept to help manage their farm" />
      </Enter>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {invites.map((invite, i) => (
          <Enter key={invite.id} delay={300 + i * 120}>
            <InviteCard
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
          </Enter>
        ))}
        <Enter delay={600}>
          <Text style={styles.note}>You won’t see their money, loans, subscription or other farms. You can leave any time.</Text>
        </Enter>
      </ScrollView>
    </View>
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
  const who = invite.ownerName ?? invite.ownerEmail ?? invite.ownerPhone ?? "Someone";
  const contact = invite.ownerName ? invite.ownerEmail ?? invite.ownerPhone : null;
  return (
    <Card style={{ gap: 14, padding: 18 }}>
      <View style={styles.row}>
        <IconChip icon={Users} index={0} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{who} invited you</Text>
          <Text style={styles.rowSubtitle}>
            {invite.farmName ? `To help manage “${invite.farmName}”` : "To help manage their farm"}
            {contact ? ` · ${contact}` : ""}
          </Text>
        </View>
      </View>
      {CAN_DO.map((line) => (
        <View key={line} style={styles.canRow}>
          <Check size={18} color={colors.success} strokeWidth={2.6} />
          <Text style={styles.canText}>{line}</Text>
        </View>
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ flexDirection: "row", gap: 10 }}>
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
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  rowSubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 1 },
  canRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  canText: { fontSize: 16, color: colors.text },
  note: { fontSize: 15, color: colors.textMuted, lineHeight: 22, paddingHorizontal: spacing.xs },
  error: { fontSize: 14, fontWeight: "600", color: colors.danger },
});
