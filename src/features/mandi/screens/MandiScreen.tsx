import React, { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Bookmark, Globe, MapPin, Phone, RefreshCw, Search, Sparkles, Store, Trophy, X } from "lucide-react-native";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { getMandiPrices, refreshMandiPrices } from "../../../api/endpoints/mandi";
import { useEstateStore } from "../../estate/store/estateStore";
import { NoEstateNotice } from "../../../components/NoEstateNotice";
import type { MandiPrice } from "../../../types/api";

const TRACKED_KEY = "chiguru.mandi.trackedCrops";
const RECENT_KEY = "chiguru.mandi.recentSearches";

function trackKey(p: MandiPrice) {
  return `${p.crop}|${p.sellerName}|${p.unit}`;
}

function freshness(priceDate: string | null): { label: string; fresh: boolean } | null {
  if (!priceDate) return null;
  const quoted = new Date(`${priceDate}T00:00:00`);
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((todayMid.getTime() - quoted.getTime()) / 86400000);
  if (!Number.isFinite(days) || days < 0) return null;
  if (days === 0) return { label: "Today", fresh: true };
  if (days === 1) return { label: "Yesterday", fresh: true };
  return { label: `${days} days old`, fresh: false };
}
function fmtPrice(p: string) {
  return Number(p).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}
function unitToKg(unit: string): number | null {
  const u = unit.toLowerCase();
  if (/quintal/.test(u)) return 100;
  if (/tonne|ton\b/.test(u)) return 1000;
  const m = u.match(/(\d+(?:\.\d+)?)\s*kg/);
  if (m) return Number(m[1]);
  if (/\bkg\b/.test(u)) return 1;
  return null;
}
function convert(price: string, unit: string, targetKg: number): string | null {
  const kg = unitToKg(unit);
  if (!kg || kg === targetKg) return null;
  const v = (Number(price) / kg) * targetKg;
  if (!Number.isFinite(v)) return null;
  return v.toLocaleString("en-IN", { maximumFractionDigits: v < 100 ? 2 : 0 });
}

const SELLER_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  Mandi: { bg: "#F3E8FD", fg: "#7B3FBF" },
  "Curing works": { bg: "#FEF3C7", fg: "#92600E" },
  "Local buyer": { bg: "#E4EEFB", fg: "#3E6FB0" },
  Exporter: { bg: "#EDE4FB", fg: colors.accent },
  Trader: { bg: colors.muted, fg: colors.textMuted },
  Government: { bg: colors.bg, fg: colors.primary },
};

function PriceCard({ row, isBest, tracked, onToggleTrack }: { row: MandiPrice; isBest: boolean; tracked: boolean; onToggleTrack: () => void }) {
  const typeColor = SELLER_TYPE_COLORS[row.sellerType] ?? { bg: colors.muted, fg: colors.textMuted };
  const f = freshness(row.priceDate);
  const perKg = convert(row.price, row.unit, 1);
  const perQuintal = convert(row.price, row.unit, 100);
  return (
    <View style={[styles.priceCard, isBest && styles.priceCardBest]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5 }}>
            {isBest ? <Trophy size={13} color="#D9A441" /> : null}
            <Text style={styles.sellerName}>{row.sellerName}</Text>
            <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor.fg }]}>{row.sellerType}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {f ? (
              <View style={[styles.freshBadge, f.fresh ? { backgroundColor: "#DCF5E6" } : { backgroundColor: colors.muted }]}>
                <Text style={[styles.freshBadgeText, { color: f.fresh ? "#1F9E5C" : colors.textMuted }]}>{f.label}</Text>
              </View>
            ) : null}
            {row.notes ? <Text style={styles.notesText}>{row.notes}</Text> : null}
          </View>
          {row.location ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <MapPin size={11} color={colors.textMuted} />
              <Text style={styles.metaText}>{row.location}</Text>
            </View>
          ) : null}
          {row.phone ? (
            <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }} onPress={() => Linking.openURL(`tel:${row.phone}`)}>
              <Phone size={11} color={colors.primary} />
              <Text style={styles.phoneText}>{row.phone}</Text>
            </Pressable>
          ) : null}
          {row.sourceName ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Globe size={11} color={colors.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>{row.sourceName}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Pressable onPress={onToggleTrack} hitSlop={8}>
            <Bookmark size={18} color={tracked ? colors.primary : colors.border} fill={tracked ? colors.primary : "transparent"} />
          </Pressable>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.priceValue, isBest && { color: "#B7791F" }]}>₹{fmtPrice(row.price)}</Text>
            <Text style={styles.unitText}>{row.unit}</Text>
            {perKg ? <Text style={styles.convText}>≈ ₹{perKg}/kg</Text> : null}
            {perQuintal ? <Text style={styles.metaText}>≈ ₹{perQuintal}/quintal</Text> : null}
          </View>
        </View>
      </View>
    </View>
  );
}

export function MandiScreen() {
  const activeEstateId = useEstateStore((s) => s.activeEstateId);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [tracked, setTracked] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const [t, r] = await Promise.all([AsyncStorage.getItem(TRACKED_KEY), AsyncStorage.getItem(RECENT_KEY)]);
      if (t) {
        try { setTracked(new Set(JSON.parse(t))); } catch { /* ignore */ }
      }
      if (r) {
        try { setRecent(JSON.parse(r)); } catch { /* ignore */ }
      }
      setHydrated(true);
    })();
  }, []);

  // Cached across tab switches: prices are only refetched when the query is
  // invalidated (the "Sync Live Data" button) or while the morning fetch is
  // still pending server-side - never just from navigating away and back.
  const query = useQuery({
    queryKey: ["mandi-prices", activeEstateId],
    queryFn: () => getMandiPrices(),
    enabled: activeEstateId != null && hydrated,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 6000 : false),
  });

  const refreshMutation = useMutation({
    mutationFn: refreshMandiPrices,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mandi-prices", activeEstateId] }),
  });

  function toggleTrack(row: MandiPrice) {
    const key = trackKey(row);
    setTracked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      AsyncStorage.setItem(TRACKED_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function removeRecent(term: string) {
    setRecent((prev) => {
      const next = prev.filter((s) => s !== term);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }

  const prices = query.data?.prices ?? [];
  const status = query.data?.status;
  const fetching = status === "pending";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return prices;
    return prices.filter(
      (p) => p.crop.toLowerCase().includes(q) || p.sellerName.toLowerCase().includes(q) || p.sellerType.toLowerCase().includes(q) || (p.location ?? "").toLowerCase().includes(q)
    );
  }, [prices, search]);

  useEffect(() => {
    const term = search.trim().toLowerCase();
    if (term.length < 2 || filtered.length === 0) return;
    const t = setTimeout(() => {
      setRecent((prev) => {
        if (prev.includes(term)) return prev;
        const next = [term, ...prev].slice(0, 8);
        AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
        return next;
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [search, filtered.length]);

  const trackedRows = prices.filter((p) => tracked.has(trackKey(p)));

  const byCrop = useMemo(() => {
    const map = new Map<string, MandiPrice[]>();
    for (const p of filtered) {
      const arr = map.get(p.crop) ?? [];
      arr.push(p);
      map.set(p.crop, arr);
    }
    const result: { crop: string; rows: MandiPrice[]; bestIds: Set<number> }[] = [];
    for (const [crop, arr] of map.entries()) {
      arr.sort((a, b) => Number(b.price) - Number(a.price));
      const bestIds = new Set<number>();
      const seenUnits = new Set<string>();
      for (const r of arr) {
        if (!seenUnits.has(r.unit)) { seenUnits.add(r.unit); bestIds.add(r.id); }
      }
      result.push({ crop, rows: arr, bestIds });
    }
    return result;
  }, [filtered]);

  if (activeEstateId == null) return <NoEstateNotice />;
  if (query.isLoading) return <LoadingView label="Loading mandi prices..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <View style={styles.hero}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View style={styles.heroIconWrap}><Sparkles size={18} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Today's market prices</Text>
            <Text style={styles.heroSubtitle}>Found automatically every morning from government mandi rates, curing works & buyer websites for your district</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm }}>
          <Text style={styles.heroUpdated}>
            {fetching ? "Searching the internet now…" : query.data?.fetchedAt ? `Updated today at ${fmtTime(query.data.fetchedAt)}` : ""}
          </Text>
          <Pressable style={styles.syncBtn} onPress={() => refreshMutation.mutate()} disabled={fetching || refreshMutation.isPending}>
            <RefreshCw size={13} color="#fff" />
            <Text style={styles.syncBtnText}>Check again</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Search size={15} color={colors.textMuted} style={{ marginRight: spacing.xs }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Type a crop — coffee, pepper, arecanut…"
          placeholderTextColor={colors.textMuted}
        />
        {search ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}><X size={15} color={colors.textMuted} /></Pressable>
        ) : null}
      </View>

      {recent.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: spacing.xs }}>
            {recent.map((term) => {
              const active = search.trim().toLowerCase() === term;
              return (
                <View key={term} style={[styles.recentChip, active && styles.recentChipActive]}>
                  <Pressable onPress={() => setSearch(active ? "" : term)}>
                    <Text style={[styles.recentChipText, active && styles.recentChipTextActive]}>{term}</Text>
                  </Pressable>
                  <Pressable onPress={() => removeRecent(term)} hitSlop={6}>
                    <X size={11} color={active ? "rgba(255,255,255,0.8)" : colors.textMuted} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      {trackedRows.length > 0 ? (
        <View>
          <Text style={styles.sectionLabel}>TRACKED CROPS</Text>
          <View style={{ gap: spacing.sm }}>
            {trackedRows.map((r) => (
              <PriceCard key={`tracked-${r.id}`} row={r} isBest={false} tracked onToggleTrack={() => toggleTrack(r)} />
            ))}
          </View>
        </View>
      ) : null}

      <View>
        <Text style={styles.sectionLabel}>ALL MARKET RATES</Text>
        {fetching && prices.length === 0 ? (
          <View style={styles.centerState}>
            <View style={styles.fetchIconWrap}><Globe size={26} color={colors.accent} /></View>
            <Text style={styles.centerTitle}>Fetching today's prices…</Text>
            <Text style={styles.centerSubtitle}>Checking government mandi rates, curing works and local buyers near you. This takes a minute or two.</Text>
          </View>
        ) : status === "error" && prices.length === 0 ? (
          <View style={styles.centerState}>
            <Store size={32} color={colors.border} />
            <Text style={styles.centerTitle}>Could not fetch today's prices</Text>
            <Text style={styles.centerSubtitle}>Check your internet and tap "Check again"</Text>
          </View>
        ) : byCrop.length === 0 ? (
          <View style={styles.centerState}>
            <Store size={32} color={colors.border} />
            <Text style={styles.centerTitle}>{search ? `No prices found for "${search}" today` : "No prices found for today yet"}</Text>
            <Text style={styles.centerSubtitle}>{search ? "Try another crop name" : 'Tap "Check again" to search once more'}</Text>
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            {byCrop.map(({ crop, rows, bestIds }) => (
              <View key={crop} style={styles.cropGroup}>
                <View style={styles.cropGroupHeader}>
                  <Text style={styles.cropGroupTitle}>{crop}</Text>
                  <Text style={styles.cropGroupCount}>{rows.length} {rows.length === 1 ? "buyer" : "buyers"}</Text>
                </View>
                <View style={{ gap: spacing.xs, padding: spacing.xs }}>
                  {rows.map((r) => (
                    <PriceCard key={r.id} row={r} isBest={bestIds.has(r.id) && rows.length > 1} tracked={tracked.has(trackKey(r))} onToggleTrack={() => toggleTrack(r)} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.footerNote}>Prices are collected automatically from public sources each morning. Always confirm with the buyer before selling.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  hero: { backgroundColor: "#7B3FBF", borderRadius: radius.md, padding: spacing.md },
  heroIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#fff", fontSize: 14.5, fontWeight: "700" },
  heroSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2, lineHeight: 15 },
  heroUpdated: { color: "rgba(255,255,255,0.7)", fontSize: 10.5, flex: 1 },
  syncBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  syncBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2 },
  searchInput: { flex: 1, fontSize: 13.5, color: colors.text },

  recentChip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", borderRadius: radius.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs },
  recentChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  recentChipText: { fontSize: 11.5, color: colors.text, textTransform: "capitalize" },
  recentChipTextActive: { color: "#fff", fontWeight: "600" },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing.sm },

  cropGroup: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: "hidden" },
  cropGroupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.bg, paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm },
  cropGroupTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  cropGroupCount: { fontSize: 10.5, color: colors.textMuted },

  priceCard: { backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.sm + 4 },
  priceCardBest: { backgroundColor: "#FFF8E8" },
  sellerName: { fontSize: 13, fontWeight: "700", color: colors.text },
  typeBadge: { borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1 },
  typeBadgeText: { fontSize: 9.5, fontWeight: "600" },
  freshBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  freshBadgeText: { fontSize: 9.5, fontWeight: "700" },
  notesText: { fontSize: 10.5, color: "#92600E", backgroundColor: "#FEF3C7", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  metaText: { fontSize: 10.5, color: colors.textMuted, flexShrink: 1 },
  phoneText: { fontSize: 11.5, color: colors.primary, fontWeight: "600" },
  priceValue: { fontSize: 15, fontWeight: "700", color: colors.text },
  unitText: { fontSize: 9.5, color: colors.textMuted },
  convText: { fontSize: 9.5, fontWeight: "700", color: colors.primary },

  centerState: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.xs },
  fetchIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#F3E8FD", alignItems: "center", justifyContent: "center" },
  centerTitle: { fontSize: 13.5, fontWeight: "700", color: colors.text, textAlign: "center" },
  centerSubtitle: { fontSize: 11.5, color: colors.textMuted, textAlign: "center", maxWidth: 260 },

  footerNote: { fontSize: 10.5, color: colors.textMuted, textAlign: "center", lineHeight: 14, paddingBottom: spacing.sm },
});
