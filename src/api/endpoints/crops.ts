import { apiFetch, apiMutate } from "../client";
import type { CreateCropRequest, Crop } from "../../types/api";

export function getCrops() {
  return apiFetch<Crop[]>("/crops");
}

export function createCrop(data: CreateCropRequest) {
  return apiMutate<Crop>("POST", "/crops", data);
}

export function updateCrop(id: number, data: Partial<CreateCropRequest>) {
  return apiMutate<Crop>("PATCH", `/crops/${id}`, data);
}

export function deleteCrop(id: number) {
  return apiMutate<null>("DELETE", `/crops/${id}`);
}

/** Merges `id`'s records (blocks, work groups, expenses, sprays, harvests, plan tasks) into `intoId`, then deletes `id`. */
export function mergeCrop(id: number, intoId: number) {
  return apiMutate<{ merged: true; sourceId: number; intoId: number }>("POST", `/crops/${id}/merge`, { intoId });
}
