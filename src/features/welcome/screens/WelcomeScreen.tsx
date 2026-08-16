import React from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import {
  ScanFace,
  ClipboardList,
  Camera,
  Wallet,
  Users,
  Tractor,
  Leaf,
  Bot,
  Stethoscope,
  Store,
  Sprout,
  Wrench,
  Volume2,
  PlayCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
} from "lucide-react-native";
import { Card } from "../../../components/Card";
import { colors, radius, spacing } from "../../../components/theme";
import { useT } from "../../../lib/i18n";
import { speak, type Lang } from "../../../lib/i18n-data";
import { useWelcomeStore } from "../store/welcomeStore";

// ── Welcome / first-time farmer walkthrough ──────────────────────────────
// Native equivalent of chiguru-owner-web's src/pages/welcome.tsx: a simple,
// big-text explainer of what Chiguru does, with short video walkthroughs and
// a "Listen" button on every section (TTS via expo-speech), since many
// owners may have low literacy. Shown once automatically after first sign-in
// (see RootNavigator) and always reachable again from More > How Chiguru works.

// The team will add real screen-recordings later; until a file exists, each
// slot shows a "video coming soon" card instead of a broken player — same
// placeholder approach as the web version (VIDEO_BASE is null there too).
const VIDEOS: { titleKey: string; descKey: string }[] = [
  { titleKey: "land.vid1", descKey: "land.vid1Desc" },
  { titleKey: "land.vid2", descKey: "land.vid2Desc" },
  { titleKey: "land.vid3", descKey: "land.vid3Desc" },
];

const FEATURES = [
  { icon: ScanFace, key: "faceAtt" },
  { icon: ClipboardList, key: "attendance" },
  { icon: Camera, key: "dailyWork" },
  { icon: Wallet, key: "accounts" },
  { icon: Users, key: "findWorkers" },
  { icon: Tractor, key: "rentMachines" },
  { icon: Leaf, key: "aiDisease" },
  { icon: Bot, key: "aiAdvisor" },
  { icon: Stethoscope, key: "realDoctor" },
] as const;

const SELL_ITEMS = [
  { icon: Store, key: "sellProduce" },
  { icon: Sprout, key: "sellNursery" },
  { icon: Wrench, key: "sellEquipment" },
] as const;

const BENEFITS = ["benefit1", "benefit2", "benefit3", "benefit4"] as const;

function ListenButton({ text, lang }: { text: string; lang: Lang }) {
  const { t } = useT();
  return (
    <Pressable
      onPress={() => speak(text, lang)}
      hitSlop={8}
      style={({ pressed }) => [styles.listenBtn, pressed && { opacity: 0.6 }]}
    >
      <Volume2 size={17} color={colors.primary} />
      <Text style={styles.listenText}>{t("home.listen")}</Text>
    </Pressable>
  );
}

// Friendly "coming soon" card - see VIDEOS above for why there's no player.
function VideoSlot({ title, desc }: { title: string; desc: string }) {
  const { t } = useT();
  return (
    <Card style={styles.videoCard}>
      <View style={styles.videoPlaceholder}>
        <PlayCircle size={34} color={colors.textMuted} />
        <Text style={styles.videoSoonText}>{t("land.videoSoon")}</Text>
      </View>
      <View style={{ padding: spacing.md }}>
        <Text style={styles.videoTitle}>{title}</Text>
        <Text style={styles.videoDesc}>{desc}</Text>
      </View>
    </Card>
  );
}

interface WelcomeScreenProps {
  // When shown as a one-time gate (RootNavigator), onDone marks it seen and
  // continues to the app. When opened from More as a replay, onDone is just
  // navigation.goBack().
  onDone: () => void;
}

export function WelcomeScreen({ onDone }: WelcomeScreenProps) {
  const { t, lang } = useT();
  const markSeen = useWelcomeStore((s) => s.markSeen);

  async function handleStart() {
    await markSeen();
    onDone();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroTitleRow}>
          <Text style={styles.heroTitle}>{t("land.heroTitle")}</Text>
          <ListenButton text={`${t("land.heroTitle")}. ${t("land.heroDesc")}`} lang={lang} />
        </View>
        <Text style={styles.heroDesc}>{t("land.heroDesc")}</Text>
      </View>

      {/* Videos */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t("land.videosTitle")}</Text>
          <ListenButton text={t("land.videosTitle")} lang={lang} />
        </View>
        <View style={{ gap: spacing.sm }}>
          {VIDEOS.map((v) => (
            <VideoSlot key={v.titleKey} title={t(v.titleKey)} desc={t(v.descKey)} />
          ))}
        </View>
      </View>

      {/* Everything the app does */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t("land.featuresTitle")}</Text>
          <ListenButton text={t("land.featuresTitle")} lang={lang} />
        </View>
        <View style={{ gap: spacing.sm }}>
          {FEATURES.map(({ icon: Icon, key }) => (
            <Card key={key} style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Icon size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.featureTitleRow}>
                  <Text style={styles.featureTitle}>{t(`land.${key}`)}</Text>
                  <ListenButton text={`${t(`land.${key}`)}. ${t(`land.${key}Desc`)}`} lang={lang} />
                </View>
                <Text style={styles.featureDesc}>{t(`land.${key}Desc`)}</Text>
              </View>
            </Card>
          ))}
        </View>
      </View>

      {/* Sell what you grow */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t("land.sellTitle")}</Text>
          <ListenButton text={t("land.sellTitle")} lang={lang} />
        </View>
        <View style={{ gap: spacing.sm }}>
          {SELL_ITEMS.map(({ icon: Icon, key }) => (
            <Card key={key} style={styles.sellCard}>
              <View style={styles.sellIconWrap}>
                <Icon size={22} color="#1F9E62" />
              </View>
              <Text style={styles.sellTitle}>{t(`land.${key}`)}</Text>
              <Text style={styles.sellDesc}>{t(`land.${key}Desc`)}</Text>
            </Card>
          ))}
        </View>
      </View>

      {/* Why farms run better with Chiguru */}
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={styles.sectionHeaderRow}>
          <Eye size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { marginLeft: spacing.xs }]}>{t("land.benefitsTitle")}</Text>
          <ListenButton
            text={`${t("land.benefitsTitle")}. ${BENEFITS.map((b) => t(`land.${b}`)).join(". ")}`}
            lang={lang}
          />
        </View>
        <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
          {BENEFITS.map((b) => (
            <View key={b} style={styles.benefitRow}>
              <CheckCircle2 size={18} color="#1F9E62" />
              <Text style={styles.benefitText}>{t(`land.${b}`)}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Final call to action */}
      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>{t("land.ctaTitle")}</Text>
        <Text style={styles.ctaNote}>{t("land.freeNote")}</Text>
        <View style={{ height: spacing.md }} />
        <Pressable style={styles.ctaButton} onPress={handleStart}>
          <Text style={styles.ctaButtonText}>{t("land.startFree")}</Text>
          <ArrowRight size={18} color={colors.primary} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  hero: { alignItems: "center", paddingVertical: spacing.lg },
  heroTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flexWrap: "wrap", justifyContent: "center" },
  heroTitle: { fontSize: 26, fontWeight: "800", color: colors.text, textAlign: "center" },
  heroDesc: { fontSize: 15, color: colors.textMuted, marginTop: spacing.sm, textAlign: "center", lineHeight: 21, paddingHorizontal: spacing.sm },

  section: { marginBottom: spacing.lg },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },

  listenBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 6, borderRadius: radius.sm },
  listenText: { fontSize: 12, fontWeight: "700", color: colors.primary },

  videoCard: { padding: 0, overflow: "hidden" },
  videoPlaceholder: { aspectRatio: 16 / 9, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", gap: spacing.xs },
  videoSoonText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  videoTitle: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  videoDesc: { fontSize: 12.5, color: colors.textMuted, marginTop: 2, lineHeight: 17 },

  featureCard: { flexDirection: "row", gap: spacing.sm },
  featureIconWrap: { width: 42, height: 42, borderRadius: radius.sm, backgroundColor: colors.primary + "1A", alignItems: "center", justifyContent: "center" },
  featureTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flexWrap: "wrap" },
  featureTitle: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  featureDesc: { fontSize: 12.5, color: colors.textMuted, marginTop: 2, lineHeight: 17 },

  sellCard: { alignItems: "center" },
  sellIconWrap: { width: 46, height: 46, borderRadius: radius.sm, backgroundColor: "#E3F5EA", alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  sellTitle: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  sellDesc: { fontSize: 12.5, color: colors.textMuted, marginTop: 2, textAlign: "center", lineHeight: 17 },

  benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  benefitText: { flex: 1, fontSize: 13.5, color: colors.text, lineHeight: 19 },

  cta: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg },
  ctaTitle: { fontSize: 19, fontWeight: "800", color: "#fff", textAlign: "center" },
  ctaNote: { fontSize: 13, color: "#fff", opacity: 0.8, marginTop: 4, textAlign: "center" },
  ctaButton: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: "#fff", borderRadius: radius.pill, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.lg },
  ctaButtonText: { fontSize: 15.5, fontWeight: "700", color: colors.primary },
});
