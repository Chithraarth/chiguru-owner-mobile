import { apiFetch, apiMutate } from "../client";
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
