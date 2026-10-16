import { apiFetch, apiMutate } from "../client";
import { getOrCreateOwnerKey } from "../../lib/ownerKey";
import type {
  DeviceInfo,
  MyFarm,
  OwnerMeResponse,
} from "../../types/api";

export function getOwnerMe() {
  return apiFetch<OwnerMeResponse>("/owners/me");
}

export function registerDevice(deviceId: string, deviceName: string) {
  // Throws ApiError(403, ..., "device_limit") with body.devices when at cap.
  return apiFetch<{ ok: true }>("/me/devices/register", {
    method: "POST",
    body: JSON.stringify({ deviceId, deviceName }),
  });
}

export function listDevices() {
  return apiFetch<DeviceInfo[]>("/me/devices");
}

export function removeDevice(id: number) {
  return apiMutate<null>("DELETE", `/me/devices/${id}`);
}

export function getMyFarms() {
  return apiFetch<MyFarm[]>("/me/farms");
}

export function linkFarm() {
  return apiMutate<null>("POST", "/me/link-farm");
}

/**
 * Permanently deletes the signed-in account and all of its data on the
 * server. Never queued offline - the caller must know it really happened.
 * The device's owner key lets the server remove this phone's classified ads too.
 */
export async function deleteMyAccount() {
  const ownerKey = await getOrCreateOwnerKey();
  return apiFetch<{ deleted: boolean }>("/owners/me", { method: "DELETE", headers: { "X-Owner-Key": ownerKey } });
}
