import React, { useState } from "react";
import { Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageCircle, Phone, ShoppingBasket, Tag } from "lucide-react-native";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { useMarketplace } from "../hooks/useMarketplace";

const CATEGORIES = [
  { key: "coffee", label: "Coffee", emoji: "☕" },
  { key: "pepper", label: "Pepper", emoji: "🌶️" },
  { key: "honey", label: "Honey", emoji: "🍯" },
  { key: "spices", label: "Spices", emoji: "🧂" },
  { key: "fruits", label: "Fruits", emoji: "🍎" },
  { key: "tea", label: "Tea", emoji: "🍵" },
  { key: "vegetables", label: "Vegetables", emoji: "🥦" },
  { key: "grains", label: "Grains", emoji: "🌾" },
  { key: "dairy", label: "Dairy", emoji: "🥛" },
  { key: "other", label: "Other", emoji: "📦" },
];
const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

export function MarketplaceScreen({ navigation }: { navigation: any }) {
  const [filter, setFilter] = useState("all");
  const { data, isLoading, refetch } = useMarketplace(filter === "all" ? undefined : filter);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}><ShoppingBasket size={22} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Farmer Market</Text>
            <Text style={styles.heroSubtitle}>Sell your produce directly to buyers — no middlemen</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Pressable style={[styles.chip, filter === "all" && styles.chipActive]} onPress={() => setFilter("all")}>
              <Text style={[styles.chipText, filter === "all" && styles.chipTextActive]}>All</Text>
            </Pressable>
            {CATEGORIES.map((c) => (
              <Pressable key={c.key} style={[styles.chip, filter === c.key && styles.chipActive]} onPress={() => setFilter(c.key)}>
                <Text style={[styles.chipText, filter === c.key && styles.chipTextActive]}>{c.emoji} {c.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {isLoading ? (
          <LoadingView label="Loading..." />
        ) : (data ?? []).length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
            <ShoppingBasket size={36} color={colors.border} />
            <Text style={styles.emptyTitle}>No produce listed here yet.</Text>
            <Text style={styles.emptySubtitle}>Be the first — tap "+ Sell produce" below.</Text>
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {(data ?? []).map((l) => {
              const cat = CAT_MAP[l.category] ?? CAT_MAP.other;
              const wa = (l.whatsapp ?? l.phone).replace(/\D/g, "");
              return (
                <Card key={l.id} style={{ padding: 0, overflow: "hidden" }}>
                  <View style={{ flexDirection: "row" }}>
                    <View style={styles.thumbWrap}>
                      {l.photoUrl ? <Image source={{ uri: l.photoUrl }} style={styles.thumb} /> : <Text style={{ fontSize: 30 }}>{cat.emoji}</Text>}
                    </View>
                    <View style={{ flex: 1, padding: spacing.sm + 4 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.productName} numberOfLines={1}>{l.productName}</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
                            <Tag size={10} color={colors.textMuted} />
                            <Text style={styles.catLabel}>{cat.label}</Text>
                          </View>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.price}>₹{l.price}</Text>
                          <Text style={styles.perUnit}>per {l.unit}</Text>
                        </View>
                      </View>
                      {l.quantity ? <Text style={styles.qtyText}>Available: {l.quantity}</Text> : null}
                      <Text style={styles.sellerText} numberOfLines={1}>{l.sellerName} · {l.location}</Text>
                    </View>
                  </View>
                  {l.description ? <Text style={styles.description}>{l.description}</Text> : null}
                  <View style={styles.actionsRow}>
                    <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${l.phone}`)}>
                      <Phone size={14} color="#fff" />
                      <Text style={styles.callBtnText}>Call to buy</Text>
                    </Pressable>
                    <Pressable style={styles.waBtn} onPress={() => Linking.openURL(`https://wa.me/${wa.length === 10 ? "91" + wa : wa}`)}>
                      <MessageCircle size={16} color={colors.primary} />
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
        <Button title="+ Sell produce" onPress={() => navigation.navigate("MarketplaceForm")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md },
  heroIconWrap: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  heroSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 11.5, marginTop: 2 },

  chip: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.sm + 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff" },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12.5, color: colors.textMuted, fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "700" },

  emptyTitle: { fontSize: 13.5, fontWeight: "600", color: colors.text, marginTop: spacing.sm },
  emptySubtitle: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },

  thumbWrap: { width: 76, height: 76, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  thumb: { width: "100%", height: "100%" },
  productName: { fontSize: 14, fontWeight: "700", color: colors.text, flexShrink: 1 },
  catLabel: { fontSize: 10.5, color: colors.textMuted },
  price: { fontSize: 14, fontWeight: "700", color: colors.primary },
  perUnit: { fontSize: 10, color: colors.textMuted },
  qtyText: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  sellerText: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  description: { fontSize: 11.5, color: colors.textMuted, paddingHorizontal: spacing.sm + 4, paddingTop: 2 },

  actionsRow: { flexDirection: "row", gap: spacing.sm, padding: spacing.sm + 4, paddingTop: spacing.sm },
  callBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: spacing.sm },
  callBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  waBtn: { width: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },

  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
});
