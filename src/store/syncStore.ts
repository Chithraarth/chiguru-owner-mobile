import { create } from "zustand";

interface SyncState {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: number | null;
  isOnline: boolean;
  setPendingCount: (n: number) => void;
  setSyncing: (v: boolean) => void;
  setLastSyncTime: (t: number) => void;
  setOnline: (v: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  isSyncing: false,
  lastSyncTime: null,
  isOnline: true,
  setPendingCount: (n) => set({ pendingCount: n }),
  setSyncing: (v) => set({ isSyncing: v }),
  setLastSyncTime: (t) => set({ lastSyncTime: t }),
  setOnline: (v) => set({ isOnline: v }),
}));
