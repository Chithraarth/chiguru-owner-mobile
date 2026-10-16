import { ShoppingCart, Tractor, Users } from "lucide-react-native";
import type { RecentAd } from "../../types/api";

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

/** Where each kind of ad opens, and its icon. */
export const AD_BOARD_STYLE: Record<RecentAd["board"], { icon: typeof Tractor; label: string; screen: string; params?: Record<string, unknown> }> = {
  hire_job: { icon: Users, label: "Work", screen: "Hire", params: { initialTab: "job" } },
  hire_rental: { icon: Tractor, label: "Machine on rent", screen: "Hire", params: { initialTab: "rental" } },
  equipment: { icon: Tractor, label: "Equipment", screen: "Equipment" },
  produce: { icon: ShoppingCart, label: "Produce", screen: "Marketplace" },
};
