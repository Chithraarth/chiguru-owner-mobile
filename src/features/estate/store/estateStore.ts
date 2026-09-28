import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const ACTIVE_ESTATE_KEY = "chiguru.activeEstateId";
const ACTIVE_RELATIONSHIP_KEY = "chiguru.activeEstateRelationship";
const OWN_FARM_SETUP_KEY = "chiguru.ownFarmSetupRequested";

export type EstateRelationship = "own" | "invited";

interface EstateState {
  activeEstateId: number | null;
  /**
   * Last-known relationship to the active estate, remembered so the app
   * still opens the right experience (Owner vs invitee) when it starts
   * offline and /me/estates can't be fetched.
   */
  activeRelationship: EstateRelationship | null;
  /**
   * True after someone on an invited farm chose "Set up my own farm": no
   * estate is active and the invited one isn't auto-picked again, so the
   * Owner app's own farm setup shows. Cleared by picking or creating a farm.
   */
  ownFarmSetup: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setActiveEstate: (id: number | null) => Promise<void>;
  rememberRelationship: (relationship: EstateRelationship) => Promise<void>;
  startOwnFarmSetup: () => Promise<void>;
}

export const useEstateStore = create<EstateState>((set, get) => ({
  activeEstateId: null,
  activeRelationship: null,
  ownFarmSetup: false,
  hydrated: false,
  hydrate: async () => {
    const [raw, rel, ownSetup] = await Promise.all([
      AsyncStorage.getItem(ACTIVE_ESTATE_KEY),
      AsyncStorage.getItem(ACTIVE_RELATIONSHIP_KEY),
      AsyncStorage.getItem(OWN_FARM_SETUP_KEY),
    ]);
    set({
      activeEstateId: raw ? Number(raw) : null,
      activeRelationship: rel === "own" || rel === "invited" ? rel : null,
      ownFarmSetup: ownSetup === "1",
      hydrated: true,
    });
  },
  setActiveEstate: async (id) => {
    // Picking a farm, or clearing it (sign-out, nothing left), both end
    // any "set up my own farm" step.
    if (id == null) {
      await AsyncStorage.multiRemove([ACTIVE_ESTATE_KEY, ACTIVE_RELATIONSHIP_KEY, OWN_FARM_SETUP_KEY]);
    } else {
      await AsyncStorage.setItem(ACTIVE_ESTATE_KEY, String(id));
      await AsyncStorage.multiRemove([ACTIVE_RELATIONSHIP_KEY, OWN_FARM_SETUP_KEY]);
    }
    set({ activeEstateId: id, activeRelationship: null, ownFarmSetup: false });
  },
  rememberRelationship: async (relationship) => {
    if (get().activeRelationship === relationship) return;
    await AsyncStorage.setItem(ACTIVE_RELATIONSHIP_KEY, relationship);
    set({ activeRelationship: relationship });
  },
  startOwnFarmSetup: async () => {
    await AsyncStorage.multiRemove([ACTIVE_ESTATE_KEY, ACTIVE_RELATIONSHIP_KEY]);
    await AsyncStorage.setItem(OWN_FARM_SETUP_KEY, "1");
    set({ activeEstateId: null, activeRelationship: null, ownFarmSetup: true });
  },
}));

// Non-hook accessor for the API client, which cannot call useEstateStore()
// outside a component render.
export function getActiveEstateId(): number | null {
  return useEstateStore.getState().activeEstateId;
}
