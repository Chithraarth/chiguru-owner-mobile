import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  User,
  CloudUpload,
  Crown,
  Smartphone,
  Megaphone,
  CircleHelp,
  Trash2,
  Settings as SettingsIcon,
  Star,
  Globe,
  LogOut,
  Repeat,
} from "lucide-react-native";
import { colors, spacing } from "./theme";
import { useSessionStore } from "../store/sessionStore";
import { signOutUser } from "../lib/firebase";

interface MenuItem {
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  screen: string;
}

const MENU_ITEMS: MenuItem[] = [
  { label: "My profile", icon: User, screen: "Profile" },
  { label: "Data backup", icon: CloudUpload, screen: "BackupRestore" },
  { label: "Subscription", icon: Crown, screen: "Subscription" },
  { label: "Manager Device", icon: Smartphone, screen: "ManagerDevices" },
  { label: "My Ads", icon: Megaphone, screen: "MyAds" },
  { label: "Helpline", icon: CircleHelp, screen: "Help" },
  { label: "Recycle Bin", icon: Trash2, screen: "Bin" },
  { label: "Settings", icon: SettingsIcon, screen: "Settings" },
];

const DRAWER_WIDTH = Math.round(Dimensions.get("window").width * 0.76);

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
  const insets = useSafeAreaInsets();

  // The Modal stays mounted for the duration of the close animation, then
  // unmounts - RN's Modal animationType only supports a vertical slide (from
  // the bottom), it cannot slide horizontally, so the left-to-right panel
  // motion is driven manually here instead.
  const [mounted, setMounted] = useState(visible);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function go(screen: string) {
    onClose();
    navigation.navigate(screen);
  }

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      </Pressable>
      <Animated.View style={[styles.drawer, { width: DRAWER_WIDTH, transform: [{ translateX }] }]}>
        <View style={[styles.profileHeader, { paddingTop: insets.top + spacing.md }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.displayName ?? user?.phoneNumber ?? "Farmer"}</Text>
            {user?.email ? <Text style={styles.profileEmail}>{user.email}</Text> : null}
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <X size={22} color="#fff" />
          </Pressable>
        </View>

        <ScrollView>
          {onSwitchFarm ? (
            <Pressable
              style={styles.row}
              onPress={() => {
                onClose();
                onSwitchFarm();
              }}
            >
              <Repeat size={20} color={colors.text} />
              <Text style={styles.rowLabel}>Switch Farm</Text>
            </Pressable>
          ) : null}
          {MENU_ITEMS.map((item) => (
            <Pressable key={item.screen} style={styles.row} onPress={() => go(item.screen)}>
              <item.icon size={20} color={colors.text} />
              <Text style={styles.rowLabel}>{item.label}</Text>
            </Pressable>
          ))}

          <View style={styles.row}>
            <Star size={20} color={colors.text} />
            <Text style={styles.rowLabel}>Rate the app</Text>
          </View>
          <View style={styles.row}>
            <Globe size={20} color={colors.text} />
            <Text style={styles.rowLabel}>Language: English</Text>
          </View>

          <Pressable
            style={styles.signOutRow}
            onPress={() => {
              onClose();
              signOutUser();
            }}
          >
            <LogOut size={18} color={colors.danger} />
            <Text style={styles.signOutLabel}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.card,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    overflow: "hidden",
  },
  profileHeader: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
  },
  profileName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  profileEmail: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 15, color: colors.text },
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    justifyContent: "center",
  },
  signOutLabel: { color: colors.danger, fontSize: 15, fontWeight: "600" },
});
