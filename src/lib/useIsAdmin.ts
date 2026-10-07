import { useQuery } from "@tanstack/react-query";
import { getOwnerMe } from "../api/endpoints/auth";
import { useSessionStore } from "../store/sessionStore";

/**
 * Chiguru staff (owners.role = 'ADMIN'). Only they see operations screens -
 * doctor earnings & payouts, nursery vendor moderation - and the server
 * refuses those actions for everyone else anyway.
 */
export function useIsAdmin(): boolean {
  const uid = useSessionStore((s) => s.user?.uid ?? null);
  const { data } = useQuery({ queryKey: ["owner-me", uid], queryFn: getOwnerMe, enabled: !!uid, staleTime: 10 * 60 * 1000 });
  return data?.owner?.role === "ADMIN";
}
