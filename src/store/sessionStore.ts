import { create } from "zustand";
import type { User } from "firebase/auth";

interface SessionState {
  user: User | null;
  authLoading: boolean;
  deviceId: string | null;
  deviceOk: boolean; // false only while a device-limit block is active
  setUser: (u: User | null) => void;
  setAuthLoading: (v: boolean) => void;
  setDeviceId: (id: string) => void;
  setDeviceOk: (v: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  authLoading: true,
  deviceId: null,
  deviceOk: true,
  setUser: (user) => set({ user }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setDeviceId: (deviceId) => set({ deviceId }),
  setDeviceOk: (deviceOk) => set({ deviceOk }),
  reset: () => set({ user: null, deviceOk: true }),
}));
