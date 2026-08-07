import React, { useEffect } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import {
  Archive,
  Bell,
  ChevronRight,
  CreditCard,
  HelpCircle,
  ImageDown,
  Languages,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { colors, radius, spacing } from "../../../components/theme";
import { useSettingsStore } from "../../../lib/settings";
import { usePushStore } from "../../../lib/push";
import { useT } from "../../../lib/i18n";
import { LANGUAGES, type TranslatedLang } from "../../../lib/i18n-data";

const TRANSLATED_CODES: TranslatedLang[] = ["en", "hi", "kn", "ta", "te", "ml", "mr"];
const TRANSLATED_LANGUAGES = LANGUAGES.filter((l): l is typeof LANGUAGES[number] & { code: TranslatedLang } =>
  TRANSLATED_CODES.includes(l.code as TranslatedLang)
);

function LinkRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.linkRow} onPress={onPress}>
      <View style={styles.linkIconWrap}>{icon}</View>
      <Text style={styles.linkLabel}>{label}</Text>
      <ChevronRight size={16} color={colors.border} />
    </Pressable>
  );
}

export function SettingsScreen({ navigation }: { navigation: any }) {
  const { lang, setLang, t } = useT();
  const lowSizePhoto = useSettingsStore((s) => s.lowSizePhoto);
  const setLowSizePhoto = useSettingsStore((s) => s.setLowSizePhoto);
  const hydrate = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const pushEnabled = usePushStore((s) => s.enabled);
  const midmonthEnabled = usePushStore((s) => s.midmonthEnabled);
  const lastSentAt = usePushStore((s) => s.lastSentAt);
  const pushLoading = usePushStore((s) => s.loading);
  const enablePush = usePushStore((s) => s.enable);
  const disablePush = usePushStore((s) => s.disable);
  const setMidmonth = usePushStore((s) => s.setMidmonth);

  async function onTogglePush(v: boolean) {
    if (v) {
      const result = await enablePush();
      if (!result.ok) Alert.alert("Couldn't turn on notifications", result.error);
    } else {
      await disablePush();
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
          <View style={[styles.iconWrap, { backgroundColor: "#E3E0EC" }]}>
            <Languages size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{t("onb.chooseLanguage")}</Text>
            <Text style={styles.cardSubtitle}>{t("onb.chooseLanguageSub")}</Text>
          </View>
        </View>
        <View style={styles.langRow}>
          {TRANSLATED_LANGUAGES.map((l) => {
            const selected = l.code === lang;
            return (
              <Pressable
                key={l.code}
                onPress={() => setLang(l.code)}
                style={[styles.langChip, selected && styles.langChipSelected]}
              >
                <Text style={[styles.langChipText, selected && styles.langChipTextSelected]}>{l.native}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
          <View style={[styles.iconWrap, { backgroundColor: "#FBEEDD" }]}>
            <Bell size={18} color="#95530F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Year Plan reminders</Text>
            <Text style={styles.cardSubtitle}>Get a phone notification when tasks in your Year Plan are due this month.</Text>
          </View>
          <Switch value={pushEnabled} onValueChange={onTogglePush} disabled={pushLoading} trackColor={{ true: colors.primary }} />
        </View>
        {pushEnabled ? (
          <View style={styles.pushSub}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={[styles.cardSubtitle, { flex: 1, marginTop: 0 }]}>Also nudge me mid-month if tasks are still pending</Text>
              <Switch value={midmonthEnabled} onValueChange={setMidmonth} trackColor={{ true: colors.primary }} />
            </View>
            {lastSentAt ? (
              <Text style={styles.pushLastSent}>Last reminder sent: {new Date(lastSentAt).toLocaleDateString()}</Text>
            ) : null}
          </View>
        ) : null}
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
          <View style={[styles.iconWrap, { backgroundColor: "#E3E0EC" }]}>
            <ImageDown size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Data-saver photos</Text>
            <Text style={styles.cardSubtitle}>Shrinks photos before uploading — faster and cheaper on slow internet.</Text>
          </View>
          <Switch value={lowSizePhoto} onValueChange={setLowSizePhoto} trackColor={{ true: colors.primary }} />
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
          <View style={[styles.iconWrap, { backgroundColor: "#E4EEFB" }]}>
            <ShieldCheck size={18} color="#3E6FB0" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Backup & restore</Text>
            <Text style={styles.cardSubtitle}>Your backup code and restore live in My Profile, together with Google sign-in backup.</Text>
            <View style={{ marginTop: spacing.sm }}>
              <Button title="Open My Profile" variant="secondary" onPress={() => navigation.navigate("Profile")} />
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
          <View style={[styles.iconWrap, { backgroundColor: "#FFEBD6" }]}>
            <Smartphone size={18} color="#95530F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Phone storage</Text>
            <Text style={styles.cardSubtitle}>
              Photos are compressed before upload and never kept longer than needed on this device. Your farm accounts
              are never deleted, and nothing waiting to upload is ever removed — everything stays safe on the server.
            </Text>
          </View>
        </View>
      </Card>

      <View style={{ gap: spacing.sm }}>
        <LinkRow icon={<HelpCircle size={16} color={colors.primary} />} label="Help" onPress={() => navigation.navigate("Help")} />
        <LinkRow icon={<Archive size={16} color={colors.primary} />} label={t("bin.title")} onPress={() => navigation.navigate("Bin")} />
        <LinkRow icon={<RefreshCw size={16} color={colors.primary} />} label="Sync Log" onPress={() => navigation.navigate("SyncLog")} />
        <LinkRow icon={<Smartphone size={16} color={colors.primary} />} label="Manager Devices" onPress={() => navigation.navigate("ManagerDevices")} />
        <LinkRow icon={<CreditCard size={16} color={colors.primary} />} label={t("more.subscription")} onPress={() => navigation.navigate("Subscription")} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  iconWrap: { width: 38, height: 38, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  cardSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  pushSub: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  pushLastSent: { fontSize: 11, color: colors.textMuted, marginTop: spacing.xs },
  langRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  langChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff" },
  langChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  langChipText: { fontSize: 13, color: colors.text },
  langChipTextSelected: { color: "#fff", fontWeight: "700" },

  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm + 4 },
  linkIconWrap: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  linkLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
});
