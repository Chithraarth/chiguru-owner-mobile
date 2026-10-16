import React, { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react-native";
import { Text } from "../../../components/Text";
import { Card } from "../../../components/Card";
import { LoadingView } from "../../../components/StateViews";
import { IconChip, ListCard, ListRow } from "../../../components/harvest";
import { colors, spacing } from "../../../components/theme";
import { getRecentAds } from "../../../api/endpoints/dashboard";
import { AD_BOARD_STYLE, timeAgo } from "../ads";

// The server caps one request; this asks for as many as it allows.
const ADS_LIMIT = 100;

/** Shop: farm equipment for sale, newest first. */
export function ShopScreen({ navigation }: { navigation: any }) {
  const adsQuery = useQuery({ queryKey: ["ads", "all"], queryFn: () => getRecentAds(ADS_LIMIT) });
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await adsQuery.refetch();
    setRefreshing(false);
  }

  if (adsQuery.isLoading) return <LoadingView label="Loading ads..." />;
  // Shop is farm equipment for sale. Rentals are on Rent Machines, worker
  // posts on Find Workers, produce on Market and plants in Nursery.
  const ads = (adsQuery.data ?? []).filter((a) => a.board === "equipment");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {ads.length === 0 ? (
        <Card style={{ alignItems: "center", gap: spacing.sm }}>
          <Text style={styles.muted}>No equipment for sale yet.</Text>
        </Card>
      ) : (
        <ListCard>
          {ads.map((ad, i) => {
            const style = AD_BOARD_STYLE[ad.board] ?? AD_BOARD_STYLE.produce;
            const when = timeAgo(ad.createdAt);
            return (
              <ListRow
                key={ad.id}
                title={ad.title}
                subtitle={[style.label, ad.place, when].filter(Boolean).join(" · ")}
                left={<IconChip icon={style.icon} index={i} />}
                right={<ChevronRight size={18} color={colors.textMuted} />}
                divider={i < ads.length - 1}
                onPress={() => navigation.navigate(style.screen, style.params)}
              />
            );
          })}
        </ListCard>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  muted: { fontSize: 15, color: colors.textMuted, textAlign: "center" },
});
