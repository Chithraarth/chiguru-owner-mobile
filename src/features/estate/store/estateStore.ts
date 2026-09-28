import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const ACTIVE_ESTATE_KEY = "chiguru.activeEstateId";
const ACTIVE_RELATIONSHIP_KEY = "chiguru.activeEstateRelationship";

export type EstateRelationship = "own" | "invited";

interface EstateState {
  activeEstateId: number | null;
  /**
   * Last-known relationship to the active estate, remembered so the app
   * still opens the right experience (Owner vs invitee) when it starts
   * offline and /me/estates can't be fetched.
   */
  activeRelationship: EstateRelationship | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setActiveEstate: (id: number | null) => Promise<void>;
  rememberRelationship: (relationship: EstateRelationship) => Promise<void>;
}

export const useEstateStore = create<EstateState>((set, get) => ({
  activeEstateId: null,
  activeRelationship: null,
  hydrated: false,
  hydrate: async () => {
    const [raw, rel] = await Promise.all([
      AsyncStorage.getItem(ACTIVE_ESTATE_KEY),
      AsyncStorage.getItem(ACTIVE_RELATIONSHIP_KEY),
    ]);
    set({
      activeEstateId: raw ? Number(raw) : null,
      activeRelationship: rel === "own" || rel === "invited" ? rel : null,
      hydrated: true,
    });
  },
  setActiveEstate: async (id) => {
    if (id == null) {
      await AsyncStorage.multiRemove([ACTIVE_ESTATE_KEY, ACTIVE_RELATIONSHIP_KEY]);
    } else {
      await AsyncStorage.setItem(ACTIVE_ESTATE_KEY, String(id));
      await AsyncStorage.removeItem(ACTIVE_RELATIONSHIP_KEY);
    }
    set({ activeEstateId: id, activeRelationship: null });
  },
  rememberRelationship: async (relationship) => {
    if (get().activeRelationship === relationship) return;
    await AsyncStorage.setItem(ACTIVE_RELATIONSHIP_KEY, relationship);
    set({ activeRelationship: relationship });
  },
}));

// Non-hook accessor for the API client, which cannot call useEstateStore()
// outside a component render.
export function getActiveEstateId(): number | null {
  return useEstateStore.getState().activeEstateId;
}
