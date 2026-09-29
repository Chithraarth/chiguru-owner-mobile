// Small building blocks of the Harvest Sun design, shared by every screen:
// round header buttons, pastel icon circles, status pills, stat tiles, list
// cards and the rolling-hills illustration used on the yellow bands.
import React from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Text } from "./Text";
import { chipColors, colors, radius, shadow, spacing } from "./theme";

export type IconType = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

/** 48px round button used on the yellow header band (menu, back, bell, add). */
export function RoundButton({
  icon: Icon,
  onPress,
  label,
  variant = "white",
}: {
  icon: IconType;
  onPress?: () => void;
  label: string;
  variant?: "white" | "green";
}) {
  const green = variant === "green";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.round,
        green ? { backgroundColor: colors.primary, borderColor: colors.primary } : null,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Icon size={green ? 24 : 22} color={green ? colors.onPrimary : colors.text} strokeWidth={2} />
    </Pressable>
  );
}

/** Pastel circle holding an icon; `index` walks the shared pastel palette. */
export function IconChip({ icon: Icon, index = 0, size = 42 }: { icon: IconType; index?: number; size?: number }) {
  const c = chipColors[index % chipColors.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
      <Icon size={Math.round(size * 0.48)} color={c.fg} strokeWidth={2} />
    </View>
  );
}

/** Initials in a pastel circle. */
export function Avatar({ name, index = 0, size = 42 }: { name: string; index?: number; size?: number }) {
  const c = chipColors[index % chipColors.length];
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.36, fontWeight: "800", color: c.fg }}>{initials || "?"}</Text>
    </View>
  );
}

const PILL_TONES = {
  neutral: { bg: colors.tint, fg: colors.text },
  good: { bg: colors.successBg, fg: colors.success },
  warn: { bg: colors.amberBg, fg: colors.warning },
  bad: { bg: colors.dangerBg, fg: colors.danger },
  accent: { bg: colors.accent, fg: colors.accentInk },
  on: { bg: colors.primary, fg: colors.onPrimary },
};

export function Pill({ text, tone = "neutral", style }: { text: string; tone?: keyof typeof PILL_TONES; style?: StyleProp<ViewStyle> }) {
  const t = PILL_TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.pillText, { color: t.fg }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={styles.sectionLabel}>{children}</Text>
    </View>
  );
}

/** Row of 2–3 white stat tiles: big green value, bold label, muted sub-label. */
export function StatTiles({ items }: { items: { label: string; value: string; sub?: string }[] }) {
  return (
    <View style={styles.statRow}>
      {items.map((it) => (
        <View key={it.label} style={styles.stat}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {it.value}
          </Text>
          <Text style={styles.statLabel} numberOfLines={1}>
            {it.label}
          </Text>
          {it.sub ? (
            <Text style={styles.statSub} numberOfLines={1}>
              {it.sub}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** White rounded card that holds a stack of ListRows. */
export function ListCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.listCard, style]}>{children}</View>;
}

export function ListRow({
  title,
  subtitle,
  left,
  right,
  divider = true,
  onPress,
}: {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  divider?: boolean;
  onPress?: () => void;
}) {
  const body = (
    <>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </>
  );
  const style = [styles.row, divider && styles.rowDivider];
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [style, pressed && { opacity: 0.7 }]}>
      {body}
    </Pressable>
  ) : (
    <View style={style}>{body}</View>
  );
}

/** Rolling green hills with a pale sun and sprouts - sits at the bottom of the yellow bands. */
export function HillsArt({ height = 140, width = 400 }: { height?: number; width?: number }) {
  const h = height;
  const sprouts = [40, 80, 120, 280, 320, 360];
  return (
    <Svg width="100%" height={h} viewBox={`0 0 ${width} ${h}`} preserveAspectRatio="none" style={StyleSheet.absoluteFillObject as any} pointerEvents="none">
      <Circle cx={width - 70} cy={Math.min(40, h * 0.3)} r={26} fill="#FFFFFF" opacity={0.55} />
      <Path d={`M0 ${h - 60} Q100 ${h - 110} 200 ${h - 70} T${width} ${h - 80} L${width} ${h} L0 ${h} Z`} fill={colors.hill} />
      <Path d={`M0 ${h - 30} Q120 ${h - 70} 240 ${h - 35} T${width} ${h - 45} L${width} ${h} L0 ${h} Z`} fill={colors.hillDark} />
      {sprouts.map((x) => (
        <Path
          key={x}
          d={`M${x} ${h - 12} v-18 M${x - 5} ${h - 24} q5 -8 5 -12 q0 4 5 12`}
          stroke={colors.primary}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  pillText: { fontSize: 13.5, fontWeight: "700" },
  sectionLabel: { fontSize: 20, fontWeight: "800", color: colors.text },
  statRow: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    ...shadow,
  },
  statValue: { fontSize: 26, fontWeight: "800", color: colors.primary, lineHeight: 32 },
  statLabel: { fontSize: 13, fontWeight: "700", color: colors.text },
  statSub: { fontSize: 12, color: colors.textMuted },
  listCard: { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: spacing.md, ...shadow },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowTitle: { fontSize: 16.5, fontWeight: "700", color: colors.text },
  rowSub: { fontSize: 14, color: colors.textMuted, marginTop: 1 },
});
