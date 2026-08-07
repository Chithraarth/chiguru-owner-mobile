import AsyncStorage from "@react-native-async-storage/async-storage";

const OWNER_KEY = "chiguru.ownerKey";

function randomKey(): string {
  return `ok-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

let cached: string | null = null;

/** Per-device anonymous ownership credential for the open classified boards (hire/equipment/produce/nursery). */
export async function getOrCreateOwnerKey(): Promise<string> {
  if (cached) return cached;
  let key = await AsyncStorage.getItem(OWNER_KEY);
  if (!key) {
    key = randomKey();
    await AsyncStorage.setItem(OWNER_KEY, key);
  }
  cached = key;
  return key;
}
