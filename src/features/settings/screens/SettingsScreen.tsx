import React, { useEffect } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { Text } from "../../../components/Text";
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
  Check,
  CalendarClock,
} from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { IconChip, ListCard, ListRow, SectionLabel } from "../../../components/harvest";
import { colors, radius, spacing, shadow } from "../../../components/theme";
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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
      <SectionLabel>{t("onb.chooseLanguage")}</SectionLabel>
      <View style={styles.langRow}>
        {TRANSLATED_LANGUAGES.map((l) => {
          const selected = l.code === lang;
          return (
            <Pressable
              key={l.code}
              onPress={() => setLang(l.code)}
              style={[styles.langChip, selected && styles.langChipSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              {selected ? <Check size={16} color={colors.text} strokeWidth={2.6} /> : null}
              <Text style={[styles.langChipText, selected && styles.langChipTextSelected]}>{l.native}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>Notifications</SectionLabel>
      <ListCard>
        <ListRow
          title="Plan reminders"
          subtitle="When Year Plan tasks are due this month"
          left={<IconChip icon={Bell} index={0} size={42} />}
          right={<Switch value={pushEnabled} onValueChange={onTogglePush} disabled={pushLoading} trackColor={{ true: colors.primary }} />}
          divider={pushEnabled}
        />
        {pushEnabled ? (
          <ListRow
            title="Mid-month nudge"
            subtitle={lastSentAt ? `Last reminder: ${new Date(lastSentAt).toLocaleDateString()}` : "If tasks are still pending"}
            left={<IconChip icon={CalendarClock} index={1} size={42} />}
            right={<Switch value={midmonthEnabled} onValueChange={setMidmonth} trackColor={{ true: colors.primary }} />}
            divider={false}
          />
        ) : null}
      </ListCard>

      <SectionLabel>App</SectionLabel>
      <ListCard>
        <ListRow
          title="Data-saver photos"
          subtitle="Smaller uploads on slow internet"
          left={<IconChip icon={ImageDown} index={3} size={42} />}
          right={<Switch value={lowSizePhoto} onValueChange={setLowSizePhoto} trackColor={{ true: colors.primary }} />}
        />
        {[
          { icon: ShieldCheck, label: "Backup & restore", sub: "Backup code and Google backup", screen: "Profile" },
          { icon: CreditCard, label: t("more.subscription"), sub: "Plan and payments", screen: "Subscription" },
          { icon: Smartphone, label: "Invitees", sub: "Helpers on your farm", screen: "ManagerDevices" },
          { icon: RefreshCw, label: "Sync log", sub: "What's saved and uploaded", screen: "SyncLog" },
          { icon: Archive, label: t("bin.title"), sub: "Restore deleted items", screen: "Bin" },
          { icon: HelpCircle, label: "Help", sub: "Call, WhatsApp, questions", screen: "Help" },
        ].map((r, i, all) => (
          <ListRow
            key={r.screen}
            title={r.label}
            subtitle={r.sub}
            left={<IconChip icon={r.icon} index={i + 4} size={42} />}
            right={<ChevronRight size={18} color={colors.textMuted} />}
            divider={i < all.length - 1}
            onPress={() => navigation.navigate(r.screen)}
          />
        ))}
      </ListCard>
      <Text style={styles.note}>
        Photos are compressed before upload and never kept longer than needed on this phone. Nothing waiting to upload is ever removed.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  container: { flex: 1, backgroundColor: colors.bg },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15.5, fontWeight: "700", color: colors.text },
  cardSubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  pushSub: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  pushLastSent: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs },
  langRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  langChip: { minHeight: 48, paddingHorizontal: 16, borderRadius: 999, borderWidth: 2.5, borderColor: colors.border, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", gap: 6 },
  langChipSelected: { borderColor: colors.primary, backgroundColor: colors.tint },
  langChipText: { fontSize: 16, fontWeight: "700", color: colors.text },
  langChipTextSelected: { color: colors.text },

  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.card, ...shadow, borderRadius: 22, padding: spacing.sm + 4 },
  linkIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  linkLabel: { flex: 1, fontSize: 15.5, fontWeight: "600", color: colors.text },
});
