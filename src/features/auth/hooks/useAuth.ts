import { useEffect } from "react";
import { queryClient } from "../../../lib/queryClient";
import { watchAuthState } from "../../../lib/firebase";
import { useSessionStore } from "../../../store/sessionStore";

let lastUid: string | null | undefined;

/** Mounted once at the app root - mirrors the web app's AuthProvider + AuthQueryClientCacheInvalidator. */
export function useAuthListener() {
  const setUser = useSessionStore((s) => s.setUser);
  const setAuthLoading = useSessionStore((s) => s.setAuthLoading);

  useEffect(() => {
    const unsubscribe = watchAuthState((user) => {
      const uid = user?.uid ?? null;
      if (lastUid !== undefined && lastUid !== uid) {
        // Account changed (including sign-out) - never leak cached data
        // across accounts on a shared device.
        queryClient.clear();
      }
      lastUid = uid;
      setUser(user);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, [setUser, setAuthLoading]);
}
