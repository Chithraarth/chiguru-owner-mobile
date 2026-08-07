import React, { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { colors, spacing } from "../../../components/theme";
import { getBackupCode, restoreBackup } from "../../../api/endpoints/estates";
import { useEstateStore } from "../../estate/store/estateStore";
import { useT } from "../../../lib/i18n";

export function BackupRestoreScreen() {
  const { t } = useT();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const setActiveEstate = useEstateStore((s) => s.setActiveEstate);
  const queryClient = useQueryClient();

  const backupQuery = useQuery({ queryKey: ["backup-code"], queryFn: getBackupCode });

  async function copyCode() {
    if (!backupQuery.data) return;
    await Clipboard.setStringAsync(backupQuery.data.recoveryCode);
    setMessage("Copied to clipboard");
  }

  async function handleRestore() {
    setMessage(null);
    setRestoring(true);
    try {
      const res = await restoreBackup(code.trim());
      if (res) {
        await setActiveEstate(res.estateId);
        queryClient.invalidateQueries({ queryKey: ["estates"] });
        setMessage(`Restored "${res.farmName}"`);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not restore with that code");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={styles.label}>Your farm's recovery code</Text>
        <Text style={styles.code}>{backupQuery.data?.recoveryCode ?? "..."}</Text>
        <Button title="Copy code" variant="secondary" onPress={copyCode} />
      </Card>

      <Text style={styles.sectionTitle}>Restore a farm on this device</Text>
      <TextField
        label="Recovery code"
        autoCapitalize="characters"
        value={code}
        onChangeText={setCode}
        placeholder="FARM-XXXX-XXXX"
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button title={t("bin.restore")} onPress={handleRestore} loading={restoring} disabled={!code.trim()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs },
  code: { fontSize: 20, fontWeight: "700", color: colors.primaryDark, marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
  message: { color: colors.primary, marginBottom: spacing.md },
});
