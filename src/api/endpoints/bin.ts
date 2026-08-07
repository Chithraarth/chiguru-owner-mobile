import { apiFetch, apiMutate } from "../client";
import type { BinResponse } from "../../types/api";

export function getBin() {
  return apiFetch<BinResponse>("/bin");
}

export function restoreFromBin(type: "group" | "worker" | "update", id: number) {
  return apiMutate<null>("POST", "/bin/restore", { type, id });
}

export function permanentlyDelete(type: "group" | "worker" | "update", id: number) {
  return apiMutate<null>("DELETE", `/bin/${type}/${id}`);
}
