import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const ACTIVE_ESTATE_KEY = "chiguru.activeEstateId";

interface EstateState {
  activeEstateId: number | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setActiveEstate: (id: number | null) => Promise<void>;
}

export const useEstateStore = create<EstateState>((set) => ({
  activeEstateId: null,
  hydrated: false,
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(ACTIVE_ESTATE_KEY);
    set({ activeEstateId: raw ? Number(raw) : null, hydrated: true });
  },
  setActiveEstate: async (id) => {
    if (id == null) {
      await AsyncStorage.removeItem(ACTIVE_ESTATE_KEY);
    } else {
      await AsyncStorage.setItem(ACTIVE_ESTATE_KEY, String(id));
    }
    set({ activeEstateId: id });
  },
}));

// Non-hook accessor for the API client, which cannot call useEstateStore()
// outside a component render.
export function getActiveEstateId(): number | null {
  return useEstateStore.getState().activeEstateId;
}
