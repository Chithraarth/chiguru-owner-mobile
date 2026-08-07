import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const LOW_SIZE_KEY = "chiguru.lowSizePhoto";

interface SettingsState {
  lowSizePhoto: boolean;
  hydrate: () => Promise<void>;
  setLowSizePhoto: (v: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  lowSizePhoto: false,
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(LOW_SIZE_KEY);
    set({ lowSizePhoto: raw === "1" });
  },
  setLowSizePhoto: async (v) => {
    await AsyncStorage.setItem(LOW_SIZE_KEY, v ? "1" : "0");
    set({ lowSizePhoto: v });
  },
}));

export function isLowSizePhoto(): boolean {
  return useSettingsStore.getState().lowSizePhoto;
}
