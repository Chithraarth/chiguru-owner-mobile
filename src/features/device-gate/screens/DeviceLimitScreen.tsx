import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Lock, LogOut, Smartphone } from "lucide-react-native";
import { Text } from "../../../components/Text";
import { Button } from "../../../components/Button";
import { HeaderBand } from "../../../components/HarvestHeader";
import { IconChip, ListCard, ListRow, SectionLabel } from "../../../components/harvest";
import { Enter, Float } from "../../../components/motion";
import { colors } from "../../../components/theme";
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
  const insets = useSafeAreaInsets();
  async function handleRemove(id: number) {
    await removeDevice(id);
    onFreedSlot();
  }

  return (
    <View style={styles.container}>
      <Enter kind="down">
        <HeaderBand title="Too many phones" subtitle={`Your plan allows ${maxDevices} phones at a time`} />
      </Enter>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]}>
        <Enter kind="pop" delay={250} style={{ alignItems: "center", paddingVertical: 10 }}>
          <Float delay={900}>
            <IconChip icon={Lock} index={0} size={96} />
          </Float>
        </Enter>
        <Enter delay={400}>
          <Text style={styles.text}>To keep your farm data safe, remove an old phone to use Chiguru on this one.</Text>
        </Enter>
        <SectionLabel>Signed-in phones</SectionLabel>
        <Enter delay={550}>
          <ListCard>
            {devices.map((item, i) => (
              <ListRow
                key={item.id}
                title={item.deviceName ?? "Unknown device"}
                subtitle={`Last used ${new Date(item.lastSeenAt).toLocaleString()}`}
                left={<IconChip icon={Smartphone} index={3} size={44} />}
                right={<Button title="Remove" variant="light" size="compact" onPress={() => handleRemove(item.id)} />}
                divider={i < devices.length - 1}
              />
            ))}
          </ListCard>
        </Enter>
      </ScrollView>
      <View style={[styles.cta, { paddingBottom: insets.bottom + 20 }]}>
        <Button title={`${t("menu.signOut")} on this phone`} variant="secondary" icon={LogOut} onPress={() => signOutUser()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 20, gap: 14 },
  text: { fontSize: 16.5, color: colors.textMuted, lineHeight: 24, textAlign: "center" },
  cta: { position: "absolute", left: 20, right: 20, bottom: 0 },
});
