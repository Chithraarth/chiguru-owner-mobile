import { useQuery } from "@tanstack/react-query";
import { useEstateStore } from "../../estate/store/estateStore";
import { getManagerMe } from "../api";

/**
 * This person's invite on the active (invited) estate — mainly the name the
 * Owner gave them, which is stamped on the attendance, expenses and work
 * updates they record.
 */
export function useInviteeMe() {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const query = useQuery({ queryKey: ["invitee-me", activeEstateId], queryFn: getManagerMe });
  return query.data ?? null;
}
