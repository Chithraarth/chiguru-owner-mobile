import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

// Tracks whether this device has already shown the first-time "Welcome to
// Chiguru" walkthrough (src/features/welcome/screens/WelcomeScreen.tsx).
// Mirrors the hydrate-from-AsyncStorage pattern used by useSettingsStore
// (src/lib/settings.ts) and useEstateStore.
const SEEN_KEY = "chiguru.welcomeSeen";

interface WelcomeState {
  hydrated: boolean;
  seen: boolean;
  hydrate: () => Promise<void>;
  markSeen: () => Promise<void>;
}

export const useWelcomeStore = create<WelcomeState>((set) => ({
  hydrated: false,
  seen: false,
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    set({ seen: raw === "1", hydrated: true });
  },
  markSeen: async () => {
    await AsyncStorage.setItem(SEEN_KEY, "1");
    set({ seen: true });
  },
}));
