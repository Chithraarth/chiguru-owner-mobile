import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { colors, spacing } from "../../../components/theme";
import { removeDevice } from "../../../api/endpoints/auth";
import { signOutUser } from "../../../lib/firebase";
import { useT } from "../../../lib/i18n";
import type { DeviceInfo } from "../../../types/api";

export function DeviceLimitScreen({
  devices,
  maxDevices,
  onFreedSlot,
}: {
  devices: DeviceInfo[];
  maxDevices: number;
  onFreedSlot: () => void;
}) {
  const { t } = useT();
  async function handleRemove(id: number) {
    await removeDevice(id);
    onFreedSlot();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Device limit reached</Text>
      <Text style={styles.subtitle}>
        Chiguru allows up to {maxDevices} devices per account. Sign out one of the
        devices below to continue on this one.
      </Text>
      <FlatList
        data={devices}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => (
          <Card style={styles.deviceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.deviceName}>{item.deviceName ?? "Unknown device"}</Text>
              <Text style={styles.deviceMeta}>
                Last seen {new Date(item.lastSeenAt).toLocaleString()}
              </Text>
            </View>
            <Button title={t("menu.signOut")} variant="danger" onPress={() => handleRemove(item.id)} />
          </Card>
        )}
      />
      <View style={{ marginTop: spacing.lg }}>
        <Button title="Sign out on this device instead" variant="secondary" onPress={() => signOutUser()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  subtitle: { color: colors.textMuted, marginBottom: spacing.lg },
  deviceRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  deviceName: { fontSize: 15, fontWeight: "600", color: colors.text },
  deviceMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
