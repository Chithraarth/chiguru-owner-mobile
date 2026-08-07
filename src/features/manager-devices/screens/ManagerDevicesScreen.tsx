import React, { useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { colors, spacing } from "../../../components/theme";
import { getManagers, inviteManager, removeManager } from "../../../api/endpoints/managers";
import { useT } from "../../../lib/i18n";

export function ManagerDevicesScreen() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["managers"], queryFn: getManagers });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: () => inviteManager(name.trim(), phone.trim()),
    onSuccess: () => {
      setName("");
      setPhone("");
      queryClient.invalidateQueries({ queryKey: ["managers"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not invite manager"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => removeManager(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["managers"] }),
  });

  function confirmRemove(id: number, managerName: string) {
    Alert.alert("Remove manager?", `${managerName} will lose access immediately.`, [
      { text: t("scan.cancel"), style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMutation.mutate(id) },
    ]);
  }

  function invite() {
    setError(null);
    if (!name.trim() || !phone.trim()) {
      setError("Enter a name and phone number");
      return;
    }
    inviteMutation.mutate();
  }

  if (query.isLoading) return <LoadingView label="Loading managers..." />;

  return (
    <View style={styles.container}>
      <Card style={{ margin: spacing.md }}>
        <Text style={styles.sectionTitle}>Invite a manager</Text>
        <TextField label={t("profile.name")} value={name} onChangeText={setName} />
        <TextField label="Phone (+91...)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Send invite" onPress={invite} loading={inviteMutation.isPending} />
      </Card>

      <FlatList
        data={query.data ?? []}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        ListEmptyComponent={<EmptyState title="No managers yet" />}
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.phone} · {item.status}
              </Text>
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
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  error: { color: colors.danger, marginBottom: spacing.md },
});
