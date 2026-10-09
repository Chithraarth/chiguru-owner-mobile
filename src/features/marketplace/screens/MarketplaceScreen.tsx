import React, { useState, useLayoutEffect } from "react";
import { Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageCircle, Phone, ShoppingBasket, Tag, Plus } from "lucide-react-native";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { HeaderAddButton, Pill } from "../../../components/harvest";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing, shadow } from "../../../components/theme";
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
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderAddButton label="Sell produce" onPress={() => navigation.navigate("MarketplaceForm")} />,
    });
  });

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
        contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}><ShoppingBasket size={22} color={colors.primary} /></View>
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
                <Card key={l.id} style={{ padding: 12, gap: 10 }}>
                  <View style={styles.photo}>
                    {l.photoUrl ? <Image source={{ uri: l.photoUrl }} style={styles.thumb} /> : <Text style={{ fontSize: 44 }}>{cat.emoji}</Text>}
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm, paddingHorizontal: 4 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName} numberOfLines={1}>{l.productName}</Text>
                      <Text style={styles.sellerText} numberOfLines={1}>{l.location} · {l.sellerName}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.price}>₹{l.price}</Text>
                      <Text style={styles.perUnit}>per {l.unit}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 4, flexWrap: "wrap" }}>
                    <Pill text={cat.label} />
                    {l.quantity ? <Pill text={`${l.quantity} available`} tone="good" /> : null}
                  </View>
                  {l.description ? <Text style={styles.description}>{l.description}</Text> : null}
                  <View style={styles.actionsRow}>
                    <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${l.phone}`)}>
                      <Phone size={18} color="#fff" />
                      <Text style={styles.callBtnText}>Call to buy</Text>
                    </Pressable>
                    <Pressable style={styles.waBtn} onPress={() => Linking.openURL(`https://wa.me/${wa.length === 10 ? "91" + wa : wa}`)}>
                      <MessageCircle size={18} color={colors.text} />
                      <Text style={styles.waText}>WhatsApp</Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.accent, borderRadius: 28, padding: spacing.md },
  heroIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: colors.accentInk, fontSize: 18, fontWeight: "800" },
  heroSubtitle: { color: colors.accentInkSoft, fontSize: 13.5, marginTop: 2 },

  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2.5, borderColor: colors.border, backgroundColor: "#fff" },
  chipActive: { backgroundColor: colors.tint, borderColor: colors.primary },
  chipText: { fontSize: 14.5, color: colors.textMuted, fontWeight: "500" },
  chipTextActive: { color: colors.text, fontWeight: "800" },

  emptyTitle: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: spacing.sm },
  emptySubtitle: { fontSize: 13.5, color: colors.textMuted, marginTop: 2 },

  photo: { height: 150, borderRadius: 22, backgroundColor: "#E9DDB3", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  thumb: { width: "100%", height: "100%" },
  productName: { fontSize: 18, fontWeight: "800", color: colors.text, flexShrink: 1 },
  catLabel: { fontSize: 12.5, color: colors.textMuted },
  price: { fontSize: 18, fontWeight: "800", color: colors.primary },
  perUnit: { fontSize: 12, color: colors.textMuted },
  qtyText: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
  sellerText: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  description: { fontSize: 14.5, color: colors.textMuted, paddingHorizontal: 4 },

  actionsRow: { flexDirection: "row", gap: 10 },
  callBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, borderRadius: 999, minHeight: 50 },
  callBtnText: { color: "#fff", fontWeight: "700", fontSize: 16.5 },
  waBtn: { flexDirection: "row", gap: 6, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.tint, borderRadius: 999, minHeight: 50 },

  waText: { fontSize: 16, fontWeight: "700", color: colors.text },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
});
