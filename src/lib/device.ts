import * as SecureStore from "expo-secure-store";
import * as Device from "expo-device";
import { Platform } from "react-native";

const DEVICE_ID_KEY = "chiguru.deviceId";

function randomId(): string {
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!id) {
    id = randomId();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  }
  return id;
}

export function describeDevice(): string {
  const model = Device.modelName ?? "Unknown device";
  return `${model} (${Platform.OS})`;
}
