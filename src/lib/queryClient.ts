import { QueryClient } from "@tanstack/react-query";
import { useSyncStore } from "../store/syncStore";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // matches chiguru-owner-web's 5min staleTime
      retry: (failureCount) => {
        // Synchronous check against the last-known connectivity state (kept
        // fresh by RootNavigator's NetInfo listener) - matches the web app's
        // "don't retry while offline" behavior without an async retry fn,
        // which TanStack Query does not support.
        if (!useSyncStore.getState().isOnline) return false;
        return failureCount < 2;
      },
    },
  },
});
