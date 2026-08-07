import React, { useMemo, useState } from "react";
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Banknote,
  Handshake,
  Locate,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Tag,
  Tractor,
  Users,
  Wrench,
} from "lucide-react-native";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { TextField } from "../../../components/TextField";
import { EmptyState, LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { useT } from "../../../lib/i18n";
import { useHire } from "../hooks/useHire";
import { getMyHireListings } from "../../../api/endpoints/hire";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { HireListing } from "../../../types/api";

type Tab = "rental" | "job";

const RENTAL_CATEGORIES = [
  { key: "tractor", label: "Tractor", emoji: "🚜" },
  { key: "jcb_hitachi", label: "JCB / Hitachi", emoji: "🏗️" },
  { key: "harvester", label: "Harvester", emoji: "🌾" },
  { key: "weight_machine", label: "Weight Machine", emoji: "⚖️" },
  { key: "auto_tempo", label: "Auto / Tempo", emoji: "🛺" },
  { key: "pickup", label: "Pickup", emoji: "🛻" },
  { key: "sprayer", label: "Spray Machine", emoji: "💧" },
  { key: "power_tiller", label: "Power Tiller", emoji: "⚙️" },
  { key: "other", label: "Other", emoji: "📦" },
];
const JOB_CATEGORIES = [
  { key: "farm_labourers", label: "Farm Labourers", emoji: "🧑‍🌾" },
  { key: "women_workers", label: "Women Workers", emoji: "👩‍🌾" },
  { key: "mestri", label: "Mestri", emoji: "🧑‍🔧" },
  { key: "manager_writer", label: "Manager / Writer", emoji: "📋" },
  { key: "other", label: "Other", emoji: "📦" },
];
const LEGACY_JOB_KEYS: Record<string, string> = {
  mp_workers: "farm_labourers",
  assam_workers: "farm_labourers",
  local_workers: "farm_labourers",
};
const RADIUS_OPTIONS = [10, 25, 50, 100];

function catList(tab: Tab) {
  return tab === "rental" ? RENTAL_CATEGORIES : JOB_CATEGORIES;
}
function catMap(tab: Tab) {
  return Object.fromEntries(catList(tab).map((c) => [c.key, c]));
}
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function Chip({ active, onPress, children, activeColor }: { active: boolean; onPress: () => void; children: string; activeColor: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && { backgroundColor: activeColor, borderColor: activeColor }]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{children}</Text>
    </Pressable>
  );
}

function ListingCard({ listing, dist, tab, onDelete }: { listing: HireListing; dist: number | null; tab: Tab; onDelete: (id: number) => void }) {
  const cat = catMap(tab)[LEGACY_JOB_KEYS[listing.category] ?? listing.category] ?? catMap(tab).other;
  const isRental = tab === "rental";
  const accent = isRental ? colors.primary : "#C77A2E";
  const loc = [listing.village, listing.taluk, listing.district].filter(Boolean).join(", ");

  function confirmDelete() {
    Alert.alert("Delete this ad?", "People will no longer see or contact you about it.", [
      { text: "Keep it", style: "cancel" },
      { text: "Yes, delete", style: "destructive", onPress: () => onDelete(listing.id) },
    ]);
  }

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, { backgroundColor: isRental ? "#EDEBF7" : "#FFF3E6" }]}>
          <Text style={{ fontSize: 30 }}>{cat.emoji}</Text>
        </View>
        <View style={{ flex: 1, padding: spacing.sm + 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                {listing.mine ? (
                  <View style={styles.mineBadge}><Text style={styles.mineBadgeText}>Your ad</Text></View>
                ) : null}
                <Text style={styles.cardTitle} numberOfLines={1}>{listing.title}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                <Tag size={11} color={colors.textMuted} />
                <Text style={styles.cardMeta}>{cat.label}</Text>
              </View>
            </View>
            {listing.rate ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Banknote size={13} color={accent} />
                <Text style={[styles.cardRate, { color: accent }]}>{listing.rate}</Text>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
            <MapPin size={11} color={colors.textMuted} />
            <Text style={styles.cardMeta} numberOfLines={1}>{listing.posterName} · {loc}</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {tab === "job" && listing.workersNeeded != null ? (
              <View style={styles.tinyBadge}>
                <Users size={10} color="#C77A2E" />
                <Text style={styles.tinyBadgeText}>{listing.workersNeeded} needed</Text>
              </View>
            ) : null}
            {dist != null ? (
              <View style={[styles.tinyBadge, { backgroundColor: "#E4EEFB" }]}>
                <Navigation size={10} color="#5B8CD6" />
                <Text style={[styles.tinyBadgeText, { color: "#5B8CD6" }]}>~{dist < 1 ? "<1" : Math.round(dist)} km away</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      {listing.description ? <Text style={styles.description}>{listing.description}</Text> : null}
      <View style={styles.cardActions}>
        <Pressable style={[styles.callBtn, { backgroundColor: accent }]} onPress={() => Linking.openURL(`tel:${listing.phone}`)}>
          <Phone size={14} color="#fff" />
          <Text style={styles.callBtnText}>Call {listing.posterName.split(" ")[0]}</Text>
        </Pressable>
        <Pressable
          style={[styles.waBtn, { borderColor: accent }]}
          onPress={() => {
            const wa = (listing.whatsapp ?? listing.phone).replace(/\D/g, "");
            Linking.openURL(`https://wa.me/${wa.length === 10 ? "91" + wa : wa}`);
          }}
        >
          <MessageCircle size={16} color={accent} />
        </Pressable>
        {listing.mine ? (
          <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

export function HireScreen({ navigation }: { navigation: any }) {
  const { t } = useT();
  const [tab, setTab] = useState<Tab | null>(null);
  const [filter, setFilter] = useState("all");
  const [mineOnly, setMineOnly] = useState(false);
  const [districtQ, setDistrictQ] = useState("");
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [radius, setRadius] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const qc = useQueryClient();

  const insets = useSafeAreaInsets();
  const { data: listings = [], isLoading, refetch, deleteListing } = useHire(tab ?? undefined);
  const { data: mine = [] } = useQuery({
    queryKey: ["hire-listings-mine"],
    queryFn: getMyHireListings,
    enabled: mineOnly,
  });
  const mineIds = useMemo(() => new Set(mine.map((m) => m.id)), [mine]);
  const decorated = useMemo(
    () => listings.map((l) => ({ ...l, mine: l.mine ?? mineIds.has(l.id) })),
    [listings, mineIds],
  );

  async function useMyLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({});
      setMyLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      if (!radius) setRadius(50);
    } finally {
      setLocating(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function onDelete(id: number) {
    deleteListing.mutate(id, { onSuccess: () => qc.invalidateQueries({ queryKey: ["hire-listings-mine"] }) });
  }

  const shown = useMemo(() => {
    const dq = districtQ.trim().toLowerCase();
    let rows = decorated.map((l) => {
      let dist: number | null = null;
      if (myLoc && l.latitude && l.longitude) dist = distanceKm(myLoc.lat, myLoc.lng, Number(l.latitude), Number(l.longitude));
      return { ...l, _dist: dist };
    });
    if (filter !== "all") rows = rows.filter((l) => (LEGACY_JOB_KEYS[l.category] ?? l.category) === filter);
    if (mineOnly) rows = rows.filter((l) => l.mine);
    if (dq) {
      rows = rows.filter(
        (l) => (l.district ?? "").toLowerCase().includes(dq) || (l.taluk ?? "").toLowerCase().includes(dq) || (l.village ?? "").toLowerCase().includes(dq),
      );
    }
    if (myLoc && radius) rows = rows.filter((l) => l._dist == null || l._dist <= radius);
    if (myLoc) rows.sort((a, b) => (a._dist == null ? 1 : b._dist == null ? -1 : a._dist - b._dist));
    return rows;
  }, [decorated, districtQ, myLoc, radius, mineOnly, filter]);

  if (tab === null) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Handshake size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{t("more.farmManager")}</Text>
            <Text style={styles.heroSubtitle}>Rent machines or find workers — contact people directly.</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Pressable style={[styles.landingTile, { backgroundColor: "#EDEBF7" }]} onPress={() => { setTab("rental"); setFilter("all"); setMineOnly(false); }}>
            <View style={[styles.landingIconWrap, { backgroundColor: "#DCD6F0" }]}>
              <Tractor size={28} color={colors.primary} />
            </View>
            <Text style={[styles.landingTitle, { color: colors.primary }]}>Rent Machines</Text>
            <Text style={[styles.landingSubtitle, { color: colors.primary }]}>Tractor, JCB, auto, pickup, cutting & more</Text>
          </Pressable>
          <Pressable style={[styles.landingTile, { backgroundColor: "#FFEBD6" }]} onPress={() => { setTab("job"); setFilter("all"); setMineOnly(false); }}>
            <View style={[styles.landingIconWrap, { backgroundColor: "#FBD9AE" }]}>
              <Users size={28} color="#95530F" />
            </View>
            <Text style={[styles.landingTitle, { color: "#95530F" }]}>Find Workers</Text>
            <Text style={[styles.landingSubtitle, { color: "#95530F" }]}>Farm labourers, mestri, manager & more</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const accent = tab === "rental" ? colors.primary : "#C77A2E";
  const AccentIcon = tab === "rental" ? Wrench : Users;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Pressable
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          onPress={() => { setTab(null); setFilter("all"); setMineOnly(false); setDistrictQ(""); setMyLoc(null); setRadius(null); }}
        >
          <Text style={[styles.backLink, { color: accent }]}>{`← ${t("more.farmManager")}`}</Text>
        </Pressable>

        <View style={[styles.hero, { backgroundColor: accent }]}>
          <View style={styles.heroIconWrap}>
            <AccentIcon size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{tab === "rental" ? "Rent Machines & Vehicles" : "Find Workers for Your Estate"}</Text>
            <Text style={styles.heroSubtitle}>
              {tab === "rental"
                ? "Tractor, JCB, Hitachi, auto, pickup, cutting & weight machines — contact owners directly."
                : "Post the workers you need — farm labourers, mestri, manager. People contact you directly."}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Pressable
            style={[styles.locBtn, myLoc && { backgroundColor: "#2E6ED6", borderColor: "#2E6ED6" }]}
            onPress={useMyLocation}
          >
            <Locate size={14} color={myLoc ? "#fff" : colors.textMuted} />
            <Text style={[styles.locBtnText, myLoc && { color: "#fff" }]}>{locating ? "Locating..." : myLoc ? "Near me" : "Use my location"}</Text>
          </Pressable>
          {myLoc ? (
            <Pressable onPress={() => { setMyLoc(null); setRadius(null); }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        {myLoc ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {RADIUS_OPTIONS.map((r) => (
                <Chip key={r} active={radius === r} onPress={() => setRadius(r)} activeColor={accent}>{`Within ${r} km`}</Chip>
              ))}
            </View>
          </ScrollView>
        ) : null}

        <TextField
          placeholder="Search district, taluk or village…"
          value={districtQ}
          onChangeText={setDistrictQ}
          containerStyle={{ marginBottom: 0 }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Chip active={filter === "all" && !mineOnly} onPress={() => { setFilter("all"); setMineOnly(false); }} activeColor={accent}>All</Chip>
            <Chip active={mineOnly} onPress={() => { setMineOnly((v) => !v); setFilter("all"); }} activeColor={accent}>📌 My Ads</Chip>
            {catList(tab).map((c) => (
              <Chip key={c.key} active={filter === c.key && !mineOnly} onPress={() => { setFilter(c.key); setMineOnly(false); }} activeColor={accent}>
                {`${c.emoji} ${c.label}`}
              </Chip>
            ))}
          </View>
        </ScrollView>

        {isLoading ? (
          <LoadingView label="Loading..." />
        ) : shown.length === 0 ? (
          <EmptyState
            title={tab === "rental" ? "No machines listed here yet." : "No worker requirements posted yet."}
            subtitle={`Be the first — tap "+ Post" below.`}
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {shown.map((l) => (
              <ListingCard key={l.id} listing={l} dist={l._dist} tab={tab} onDelete={onDelete} />
            ))}
          </View>
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
        <Button title="+ Post listing" onPress={() => navigation.navigate("HireForm", { listingType: tab })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  hero: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md },
  heroIconWrap: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  heroSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },

  landingTile: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: "center", gap: spacing.xs },
  landingIconWrap: { width: 56, height: 56, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  landingTitle: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  landingSubtitle: { fontSize: 10.5, textAlign: "center", opacity: 0.85 },

  backLink: { fontSize: 13, fontWeight: "700" },

  locBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", borderRadius: radius.pill, paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.xs + 2 },
  locBtnText: { fontSize: 12, fontWeight: "500", color: colors.textMuted },

  chip: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.sm + 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff" },
  chipText: { fontSize: 12.5, color: colors.textMuted, fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "700" },

  cardTop: { flexDirection: "row" },
  cardIcon: { width: 76, height: 76, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.text, flexShrink: 1 },
  cardMeta: { fontSize: 11, color: colors.textMuted, flexShrink: 1 },
  cardRate: { fontSize: 13, fontWeight: "700" },
  mineBadge: { backgroundColor: "#E4EEFB", borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1 },
  mineBadgeText: { fontSize: 9, fontWeight: "700", color: "#5B8CD6" },
  tinyBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#FFEBD6", borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2 },
  tinyBadgeText: { fontSize: 9.5, fontWeight: "700", color: "#95530F" },
  description: { fontSize: 12, color: colors.textMuted, paddingHorizontal: spacing.sm + 4, paddingTop: spacing.xs },

  cardActions: { flexDirection: "row", gap: spacing.sm, padding: spacing.sm + 4, paddingTop: spacing.sm },
  callBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: radius.sm, paddingVertical: spacing.sm },
  callBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  waBtn: { width: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: radius.sm },
  deleteBtn: { paddingHorizontal: spacing.sm + 2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#F5C6C6", borderRadius: radius.sm },
  deleteBtnText: { color: colors.danger, fontSize: 12, fontWeight: "700" },

  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
});
