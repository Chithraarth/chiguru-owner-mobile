import React, { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { ChipSelect } from "../../../components/ChipSelect";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { getManagers, inviteManager, removeManager } from "../../../api/endpoints/managers";
import { useMyEstates } from "../../estate/hooks/useMyEstates";
import { useEstateStore } from "../../estate/store/estateStore";
import { useT } from "../../../lib/i18n";

// Screen title is "Invitees" in the UI - the file/route keep the historical
// "manager" name to avoid a wider rename across navigation for this change.
type ContactMode = "phone" | "email";

export function ManagerDevicesScreen() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["managers"], queryFn: getManagers });
  const [mode, setMode] = useState<ContactMode>("phone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Each invite is for exactly one of your own farms (never one you were
  // invited to). Defaults to the farm you're on.
  const ownEstates = (useMyEstates().data ?? []).filter((e) => e.relationship === "own");
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const [pickedEstateId, setPickedEstateId] = useState<number | null>(null);
  const estateId =
    pickedEstateId ?? (ownEstates.some((e) => e.id === activeEstateId) ? activeEstateId : ownEstates[0]?.id ?? null);
  const estateLabel = (id: number) => {
    const e = ownEstates.find((x) => x.id === id);
    if (!e) return "";
    return ownEstates.filter((x) => x.farmName === e.farmName).length > 1 ? `${e.farmName} (#${e.id})` : e.farmName;
  };
  const estateName = (id: number | null) => (id != null ? ownEstates.find((e) => e.id === id)?.farmName ?? null : null);

  const inviteMutation = useMutation({
    mutationFn: () =>
      inviteManager(name.trim(), mode === "phone" ? { phone: phone.trim() } : { email: email.trim() }, estateId!),
    onSuccess: () => {
      setName("");
      setPhone("");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["managers"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not send invite"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => removeManager(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["managers"] }),
  });

  function confirmRemove(id: number, inviteeName: string) {
    Alert.alert("Remove invitee?", `${inviteeName} will lose access immediately.`, [
      { text: t("scan.cancel"), style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMutation.mutate(id) },
    ]);
  }

  function invite() {
    setError(null);
    if (!name.trim()) {
      setError("Enter a name");
      return;
    }
    if (mode === "phone" && !phone.trim()) {
      setError("Enter a phone number");
      return;
    }
    if (mode === "email" && !email.trim()) {
      setError("Enter an email address");
      return;
    }
    if (estateId == null) {
      setError("Set up a farm first, then invite someone to help manage it");
      return;
    }
    inviteMutation.mutate();
  }

  if (query.isLoading) return <LoadingView label="Loading invitees..." />;

  return (
    <View style={styles.container}>
      <Card style={{ margin: spacing.md }}>
        <Text style={styles.sectionTitle}>Invite someone</Text>
        <TextField label={t("profile.name")} value={name} onChangeText={setName} />

        {ownEstates.length > 1 ? (
          <ChipSelect
            label="Which farm is this for?"
            options={ownEstates.map((e) => estateLabel(e.id))}
            value={estateId != null ? estateLabel(estateId) : ""}
            onChange={(label) => setPickedEstateId(ownEstates.find((e) => estateLabel(e.id) === label)?.id ?? null)}
          />
        ) : null}

        <View style={styles.modeRow}>
          <Pressable style={[styles.modeTab, mode === "phone" && styles.modeTabActive]} onPress={() => setMode("phone")}>
            <Text style={[styles.modeTabText, mode === "phone" && styles.modeTabTextActive]}>Phone</Text>
          </Pressable>
          <Pressable style={[styles.modeTab, mode === "email" && styles.modeTabActive]} onPress={() => setMode("email")}>
            <Text style={[styles.modeTabText, mode === "email" && styles.modeTabTextActive]}>Email</Text>
          </Pressable>
        </View>

        {mode === "phone" ? (
          <TextField label="Phone (+91...)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        ) : (
          <TextField label="Email address" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Send invite" onPress={invite} loading={inviteMutation.isPending} />
      </Card>

      <FlatList
        data={query.data ?? []}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: spacing.xl }}
        ListEmptyComponent={<EmptyState title="No invitees yet" />}
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.phone ?? item.email} · {item.status}
              </Text>
              {estateName(item.estateId) ? <Text style={styles.meta}>{estateName(item.estateId)}</Text> : null}
            </View>
            {item.status !== "removed" ? (
              <Button title="Remove" variant="danger" onPress={() => confirmRemove(item.id, item.name)} />
            ) : null}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionTitle: { fontSize: 16.5, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  modeRow: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.sm },
  modeTab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeTabText: { fontSize: 14.5, fontWeight: "600", color: colors.text },
  modeTabTextActive: { color: "#fff" },
  row: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 16.5, fontWeight: "600", color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  error: { color: colors.danger, marginBottom: spacing.md },
});
