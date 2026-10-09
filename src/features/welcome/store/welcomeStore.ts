import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

// Tracks whether this device has already shown the first-time "Welcome to
// Chiguru" walkthrough (src/features/welcome/screens/WelcomeScreen.tsx).
// Mirrors the hydrate-from-AsyncStorage pattern used by useSettingsStore
// (src/lib/settings.ts) and useEstateStore.
const SEEN_KEY = "chiguru.welcomeSeen";
// The three-slide intro shown before sign-in on a fresh install.
const INTRO_KEY = "chiguru.introSeen";

interface WelcomeState {
  hydrated: boolean;
  seen: boolean;
  introSeen: boolean;
  hydrate: () => Promise<void>;
  markSeen: () => Promise<void>;
  markIntroSeen: () => Promise<void>;
}

export const useWelcomeStore = create<WelcomeState>((set) => ({
  hydrated: false,
  seen: false,
  introSeen: false,
  hydrate: async () => {
    const [raw, intro] = await Promise.all([AsyncStorage.getItem(SEEN_KEY), AsyncStorage.getItem(INTRO_KEY)]);
    set({ seen: raw === "1", introSeen: intro === "1", hydrated: true });
  },
  markSeen: async () => {
    await AsyncStorage.setItem(SEEN_KEY, "1");
    set({ seen: true });
  },
  markIntroSeen: async () => {
    await AsyncStorage.setItem(INTRO_KEY, "1");
    set({ introSeen: true });
  },
}));
