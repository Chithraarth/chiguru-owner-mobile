import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { colors, radius, spacing } from "../../../components/theme";
import { useT } from "../../../lib/i18n";

export interface ToolItem {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  chipBg: string;
  chipColor: string;
  title: string;
  desc: string;
  screen: string;
}

function ToolTile({
  icon: Icon,
  chipBg,
  chipColor,
  title,
  desc,
  compact,
  onPress,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  chipBg: string;
  chipColor: string;
  title: string;
  desc?: string;
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tile, compact && styles.tileCompact]} onPress={onPress}>
      <View style={[styles.chip, { backgroundColor: chipBg }, compact && styles.chipCompact]}>
        <Icon size={compact ? 18 : 20} color={chipColor} />
      </View>
      <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>{title}</Text>
      {desc ? <Text style={styles.desc} numberOfLines={1}>{desc}</Text> : null}
    </Pressable>
  );
}

// Primary 2-column grid (Work Attendance, Work Updates, Farm Accounts, + a
// trailing "More" toggle tile that expands MoreGrid below it).
export function ToolSection({
  items,
  navigation,
  moreOpen,
  onToggleMore,
}: {
  items: ToolItem[];
  navigation: any;
  moreOpen: boolean;
  onToggleMore: () => void;
}) {
  const { t } = useT();
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <ToolTile
          key={item.title}
          icon={item.icon}
          chipBg={item.chipBg}
          chipColor={item.chipColor}
          title={item.title}
          desc={item.desc}
          onPress={() => navigation.navigate(item.screen)}
        />
      ))}
      <Pressable style={styles.tile} onPress={onToggleMore}>
        <View style={[styles.chip, { backgroundColor: colors.muted }]}>
          {moreOpen ? <ChevronUp size={20} color={colors.textMuted} /> : <ChevronDown size={20} color={colors.textMuted} />}
        </View>
        <Text style={styles.title}>{t("home.more")}</Text>
      </Pressable>
    </View>
  );
}

// Secondary 3-column grid revealed by the "More" toggle.
export function MoreGrid({ items, navigation }: { items: ToolItem[]; navigation: any }) {
  return (
    <View style={styles.gridCompact}>
      {items.map((item) => (
        <ToolTile
          key={item.title}
          icon={item.icon}
          chipBg={item.chipBg}
          chipColor={item.chipColor}
          title={item.title}
          compact
          onPress={() => navigation.navigate(item.screen)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  gridCompact: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  tile: {
    width: "47%",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  tileCompact: {
    width: "30.5%",
    padding: spacing.sm + 2,
    alignItems: "center",
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  chipCompact: { width: 36, height: 36, borderRadius: 18, marginBottom: 6 },
  title: { fontSize: 15, fontWeight: "700", color: colors.text },
  titleCompact: { fontSize: 12.5, textAlign: "center" },
  desc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
