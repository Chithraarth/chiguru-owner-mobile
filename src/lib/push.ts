import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { create } from "zustand";
import { registerPushDevice, unregisterPushDevice, updatePushSettings, getPushStatus } from "../api/endpoints/push";

const DEVICE_ID_KEY = "chiguru.pushDeviceId";
const ENABLED_KEY = "chiguru.pushEnabled";
const TOKEN_KEY = "chiguru.pushToken";

function randomId(): string {
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = randomId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

interface PushState {
  enabled: boolean;
  midmonthEnabled: boolean;
  lastSentAt: string | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  enable: () => Promise<{ ok: boolean; error?: string }>;
  disable: () => Promise<void>;
  setMidmonth: (v: boolean) => Promise<void>;
}

export const usePushStore = create<PushState>((set, get) => ({
  enabled: false,
  midmonthEnabled: true,
  lastSentAt: null,
  loading: false,

  hydrate: async () => {
    const enabled = (await AsyncStorage.getItem(ENABLED_KEY)) === "1";
    set({ enabled });
    if (!enabled) return;
    try {
      const deviceId = await getOrCreateDeviceId();
      const status = await getPushStatus(deviceId);
      set({ lastSentAt: status.lastSentAt, midmonthEnabled: status.midmonthEnabled });
      // Token can rotate (reinstall, restore) - silently refresh registration
      // if permission is already granted, without re-prompting the user.
      const { status: perm } = await Notifications.getPermissionsAsync();
      if (perm === "granted") await refreshRegistration(get().midmonthEnabled);
    } catch {
      // Not registered yet on the backend, or offline - leave enabled as-is,
      // the next explicit toggle will re-register.
    }
  },

  enable: async () => {
    set({ loading: true });
    try {
      const result = await refreshRegistration(get().midmonthEnabled, true);
      if (!result.ok) return result;
      await AsyncStorage.setItem(ENABLED_KEY, "1");
      set({ enabled: true });
      return { ok: true };
    } finally {
      set({ loading: false });
    }
  },

  disable: async () => {
    set({ loading: true });
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) await unregisterPushDevice(token);
      await AsyncStorage.setItem(ENABLED_KEY, "0");
      set({ enabled: false });
    } finally {
      set({ loading: false });
    }
  },

  setMidmonth: async (v) => {
    set({ midmonthEnabled: v });
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) await updatePushSettings(token, v);
  },
}));

async function refreshRegistration(
  midmonth: boolean,
  requestPermission = false
): Promise<{ ok: boolean; error?: string }> {
  if (!Device.isDevice) {
    return { ok: false, error: "Push notifications need a physical device." };
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted" && requestPermission) {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== "granted") {
    return { ok: false, error: "Notification permission was not granted." };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("plan-reminders", {
      name: "Year Plan reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    return { ok: false, error: "Push isn't set up for this build yet (missing EAS project id)." };
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;
    const deviceId = await getOrCreateDeviceId();
    await registerPushDevice(deviceId, token, midmonth);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not get a push token." };
  }
}
