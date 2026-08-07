import { apiFetch, apiMutate } from "../client";

export function registerPushDevice(deviceId: string, expoPushToken: string, midmonth?: boolean) {
  return apiMutate<{ ok: true }>("POST", "/push/register", { deviceId, expoPushToken, midmonth });
}

export function updatePushSettings(expoPushToken: string, midmonth: boolean) {
  return apiMutate<null>("PATCH", "/push/settings", { expoPushToken, midmonth });
}

export function unregisterPushDevice(expoPushToken: string) {
  return apiMutate<null>("DELETE", "/push/register", { expoPushToken });
}

export function getPushStatus(deviceId: string) {
  return apiFetch<{ lastSentAt: string | null; midmonthEnabled: boolean }>(`/push/status?deviceId=${deviceId}`);
}
