import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  Leaf,
  Droplets,
  CalendarDays,
  Sprout,
  BookOpen,
  UserCheck,
  Landmark,
  BarChart3,
  Stethoscope,
  Sparkles,
  Store,
  TrendingUp,
  User,
  Users,
  Megaphone,
  Crown,
  Wallet,
  CloudUpload,
  Trash2,
  Settings as SettingsIcon,
  CircleHelp,
  LogOut,
  Repeat,
} from "lucide-react-native";
import { Text } from "./Text";
import { Avatar, HillsArt, IconChip, type IconType } from "./harvest";
import { colors, radius } from "./theme";
import { useSessionStore } from "../store/sessionStore";
import { useEstates } from "../features/estate/hooks/useEstates";
import { signOutUser } from "../lib/firebase";

interface MenuItem {
  label: string;
  icon: IconType;
  screen: string;
}

const GROUPS: { title: string; items: MenuItem[] }[] = [
  {
    title: "Farm",
    items: [
      { label: "Crops & plots", icon: Leaf, screen: "Crops" },
      { label: "Spray log", icon: Droplets, screen: "Sprays" },
      { label: "Year plan", icon: CalendarDays, screen: "YearPlan" },
      { label: "Harvests", icon: Sprout, screen: "Harvests" },
    ],
  },
  {
    title: "Money",
    items: [
      { label: "Farm accounts", icon: BookOpen, screen: "FarmAccounts" },
      { label: "Labour payments", icon: UserCheck, screen: "LabourRecords" },
      { label: "Loans", icon: Landmark, screen: "Loans" },
      { label: "Reports", icon: BarChart3, screen: "Reports" },
    ],
  },
  {
    title: "Advisory & market",
    items: [
      { label: "Agri doctor", icon: Stethoscope, screen: "AgriDoctor" },
      { label: "AI advisor", icon: Sparkles, screen: "AgriAi" },
      { label: "Market", icon: Store, screen: "Shop" },
      { label: "Mandi prices", icon: TrendingUp, screen: "Mandi" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "My profile", icon: User, screen: "Profile" },
      { label: "Invitees", icon: Users, screen: "ManagerDevices" },
      { label: "My ads", icon: Megaphone, screen: "MyAds" },
      { label: "Subscription", icon: Crown, screen: "Subscription" },
      { label: "Wallet", icon: Wallet, screen: "Wallet" },
      { label: "Data backup", icon: CloudUpload, screen: "BackupRestore" },
      { label: "Recycle bin", icon: Trash2, screen: "Bin" },
    ],
  },
];

const DRAWER_WIDTH = Math.min(340, Math.round(Dimensions.get("window").width * 0.82));

/**
 * Left sidebar opened from ☰: slides in from the left over a dimmed screen.
 * Yellow top with the person and the farm they're working on (tap to
 * switch), grouped links, and Settings · Help · Sign out pinned at the foot.
 */
export function AppDrawer({
  visible,
  onClose,
  navigation,
  onSwitchFarm,
}: {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  onSwitchFarm?: () => void;
}) {
  const user = useSessionStore((s) => s.user);
  const { data: estates, activeEstateId } = useEstates();
  const farmName = estates?.find((e) => e.id === activeEstateId)?.farmName;
  const insets = useSafeAreaInsets();

  // RN's Modal can only slide vertically, so the left-to-right motion is
  // driven here; the Modal stays mounted until the close animation ends.
  const [mounted, setMounted] = useState(visible);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Every drawer screen lives on the Home tab's stack, so go through it -
  // that resolves from whichever tab the drawer was opened on.
  function go(screen: string) {
    onClose();
    navigation.navigate("DashboardTab", { screen, initial: false });
  }

  if (!mounted) return null;

  const name = user?.displayName || "Farmer";
  const phone = user?.phoneNumber ?? user?.email ?? "";

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close menu">
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      </Pressable>
      <Animated.View style={[styles.drawer, { width: DRAWER_WIDTH, transform: [{ translateX }] }]}>
        <View style={[styles.top, { paddingTop: insets.top + 16 }]}>
          <HillsArt height={80} />
          <View style={styles.personRow}>
            <Avatar name={name} index={1} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              {phone ? (
                <Text style={styles.phone} numberOfLines={1}>
                  {phone}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close menu" style={styles.close} hitSlop={6}>
              <X size={20} color={colors.text} />
            </Pressable>
          </View>
          {onSwitchFarm ? (
            <Pressable
              style={({ pressed }) => [styles.farmCard, pressed && { opacity: 0.85 }]}
              onPress={() => {
                onClose();
                onSwitchFarm();
              }}
              accessibilityRole="button"
            >
              <IconChip icon={Leaf} index={1} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.farmHint}>Working on</Text>
                <Text style={styles.farmName} numberOfLines={1}>
                  {farmName ?? "No farm yet"}
                </Text>
              </View>
              <View style={styles.switchRow}>
                <Repeat size={15} color={colors.primary} strokeWidth={2.2} />
                <Text style={styles.switchText}>Switch</Text>
              </View>
            </Pressable>
          ) : null}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list}>
          {GROUPS.map((g, gi) => (
            <View key={g.title}>
              <Text style={styles.groupTitle}>{g.title.toUpperCase()}</Text>
              {g.items.map((item, i) => (
                <Pressable
                  key={item.screen}
                  onPress={() => go(item.screen)}
                  style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.muted }]}
                  accessibilityRole="button"
                >
                  <IconChip icon={item.icon} index={gi * 2 + i} size={36} />
                  <Text style={styles.itemLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          <FooterButton icon={SettingsIcon} label="Settings" onPress={() => go("Settings")} />
          <FooterButton icon={CircleHelp} label="Help" onPress={() => go("Help")} />
          <FooterButton
            icon={LogOut}
            label="Sign out"
            danger
            onPress={() => {
              onClose();
              signOutUser();
            }}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

function FooterButton({ icon: Icon, label, onPress, danger }: { icon: IconType; label: string; onPress: () => void; danger?: boolean }) {
  const fg = danger ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.footerBtn, { backgroundColor: danger ? colors.dangerBg : colors.muted }, pressed && { opacity: 0.8 }]}
    >
      <Icon size={17} color={fg} strokeWidth={2.2} />
      <Text style={[styles.footerText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.card,
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  top: { backgroundColor: colors.accent, paddingHorizontal: 18, paddingBottom: 18, overflow: "hidden" },
  personRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 19, fontWeight: "800", color: colors.accentInk },
  phone: { fontSize: 14, color: colors.accentInkSoft },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  farmCard: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  farmHint: { fontSize: 12.5, color: colors.textMuted },
  farmName: { fontSize: 16, fontWeight: "800", color: colors.text, textTransform: "capitalize" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  switchText: { fontSize: 14, fontWeight: "800", color: colors.primary },
  list: { paddingHorizontal: 12, paddingBottom: 12 },
  groupTitle: { fontSize: 13, fontWeight: "800", letterSpacing: 1, color: colors.textMuted, paddingTop: 12, paddingBottom: 2, paddingHorizontal: 4 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 46, paddingHorizontal: 6, borderRadius: 14 },
  itemLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  footer: { flexDirection: "row", gap: 6, paddingTop: 8, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.border },
  footerBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  footerText: { fontSize: 14.5, fontWeight: "800" },
});
