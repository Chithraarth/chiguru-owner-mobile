import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Cloud,
  Receipt,
  Repeat,
  ShieldCheck,
  Sprout,
  UserCheck,
  Users,
} from "lucide-react-native";
import { Text } from "../../components/Text";
import { IconChip, type IconType } from "../../components/harvest";
import { Enter, Float, LivingHills, Nudge, Wiggle } from "../../components/motion";
import { colors, shadow } from "../../components/theme";

interface Slide {
  icon: IconType;
  title: string;
  text: string;
  points: { icon: IconType; label: string }[];
  cta: string;
}

const SLIDES: Slide[] = [
  {
    icon: Sprout,
    title: "Run your whole farm from one phone",
    text: "Workers, wages, crops and money — all in one place, even without network.",
    points: [
      { icon: UserCheck, label: "Attendance in seconds" },
      { icon: Cloud, label: "Works offline" },
    ],
    cta: "Next",
  },
  {
    icon: BookOpen,
    title: "Know where every rupee goes",
    text: "Wages, advances, expenses, harvest income and loans add up on their own.",
    points: [
      { icon: Receipt, label: "Snap a receipt" },
      { icon: BarChart3, label: "Season reports" },
    ],
    cta: "Next",
  },
  {
    icon: Users,
    title: "Invite helpers. Stay in control.",
    text: "Invitees mark attendance and post updates — they never see your money or settings.",
    points: [
      { icon: ShieldCheck, label: "Limited access" },
      { icon: Repeat, label: "Many farms" },
    ],
    cta: "Get started",
  },
];

/** Three welcome slides shown once before sign-in. Swipe or tap Next; Skip goes straight to sign-in. */
export function IntroScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  const next = () => (last ? onDone() : setIndex((i) => i + 1));
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_, g) => {
          if (g.dx < -50) next();
          else if (g.dx > 50) prev();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index],
  );

  const Icon = slide.icon;

  return (
    <View style={styles.screen} {...pan.panHandlers}>
      <Enter kind="down" style={styles.band}>
        <LivingHills height={200} />
        {/* Keyed by slide so each one plays its entrance again. */}
        <Enter key={`hero-${index}`} kind="pop" delay={200} style={[styles.heroWrap, { top: insets.top + 60 }]}>
          <Float delay={900}>
            <View style={styles.hero}>
              <Wiggle>
                <Icon size={84} color={colors.primary} strokeWidth={1.6} />
              </Wiggle>
            </View>
          </Float>
        </Enter>
      </Enter>

      <Enter delay={800} style={[styles.skip, { top: insets.top + 12 }]}>
        <Pressable onPress={onDone} hitSlop={10} accessibilityRole="button">
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </Enter>

      <View style={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
        <Enter key={`t-${index}`} delay={350}>
          <Text style={styles.title}>{slide.title}</Text>
        </Enter>
        <Enter key={`p-${index}`} delay={480}>
          <Text style={styles.text}>{slide.text}</Text>
        </Enter>
        <View style={styles.points}>
          {slide.points.map((pt, j) => (
            <Enter key={`${index}-${pt.label}`} kind="pop" delay={750 + j * 150}>
              <View style={styles.point}>
                <IconChip icon={pt.icon} index={j + index} size={38} />
                <Text style={styles.pointText}>{pt.label}</Text>
              </View>
            </Enter>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <Dots index={index} count={SLIDES.length} />
        <Pressable
          onPress={next}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }]}
        >
          <Nudge>
            <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.4} />
          </Nudge>
          <Text style={styles.ctaText}>{slide.cta}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Dots({ index, count }: { index: number; count: number }) {
  const widths = useRef(Array.from({ length: count }, (_, i) => new Animated.Value(i === 0 ? 26 : 10))).current;
  useEffect(() => {
    Animated.parallel(
      widths.map((w, i) => Animated.timing(w, { toValue: i === index ? 26 : 10, duration: 350, useNativeDriver: false })),
    ).start();
  }, [index, widths]);
  return (
    <View style={styles.dots} accessibilityLabel={`Slide ${index + 1} of ${count}`}>
      {widths.map((w, i) => (
        <Animated.View key={i} style={[styles.dot, { width: w, backgroundColor: i === index ? colors.primary : "#E3D9B8" }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  band: {
    height: "47%",
    backgroundColor: colors.accent,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    overflow: "hidden",
  },
  heroWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  hero: { width: 160, height: 160, borderRadius: 80, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  skip: { position: "absolute", right: 20 },
  skipText: { fontSize: 16, fontWeight: "700", color: colors.text, paddingVertical: 10, paddingHorizontal: 6 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24, alignItems: "center", gap: 12 },
  title: { fontSize: 30, fontWeight: "800", color: colors.text, textAlign: "center", lineHeight: 34 },
  text: { fontSize: 16.5, color: colors.textMuted, textAlign: "center", lineHeight: 24 },
  points: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 6 },
  point: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 16,
    ...shadow,
  },
  pointText: { fontSize: 16, fontWeight: "700", color: colors.text },
  dots: { flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 6 },
  dot: { height: 10, borderRadius: 5 },
  cta: {
    alignSelf: "stretch",
    minHeight: 58,
    borderRadius: 999,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
});
