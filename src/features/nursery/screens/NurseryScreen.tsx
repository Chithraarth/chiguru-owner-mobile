import React, { useMemo, useState } from "react";
import { Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Phone, Search, Sprout, Star, Store, X } from "lucide-react-native";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import { getNurseryListings, getNurseryVendorDetail, getNurseryVendors, submitNurseryRating } from "../../../api/endpoints/nursery";
import type { NurseryListing, NurseryVendor } from "../../../types/api";

const NURSERY_CATS = [
  { key: "All", emoji: "🌿", label: "All" },
  { key: "Vegetable Seedlings", emoji: "🥦", label: "Vegetables" },
  { key: "Fruit Saplings", emoji: "🍋", label: "Fruit Trees" },
  { key: "Flowering Plants", emoji: "🌸", label: "Flowering" },
  { key: "Trees & Timber", emoji: "🌳", label: "Trees" },
  { key: "Herbs & Spices", emoji: "🌿", label: "Herbs" },
  { key: "Indoor Plants", emoji: "🪴", label: "Indoor" },
  { key: "Medicinal Plants", emoji: "🌱", label: "Medicinal" },
];

const CAT_EMOJIS: Record<string, string> = {
  "Vegetable Seedlings": "🥦", "Fruit Saplings": "🍋", "Flowering Plants": "🌸",
  "Trees & Timber": "🌳", "Herbs & Spices": "🌿", "Indoor Plants": "🪴", "Medicinal Plants": "🌱",
};

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} color={i <= Math.round(value) ? "#F5B93F" : colors.border} fill={i <= Math.round(value) ? "#F5B93F" : colors.border} />
      ))}
    </View>
  );
}

function ListingCard({ listing, vendorName, vendorLocation, vendorPhone, onVendorTap, onContact }: {
  listing: NurseryListing;
  vendorName: string;
  vendorLocation: string;
  vendorPhone: string;
  onVendorTap?: () => void;
  onContact: () => void;
}) {
  const emoji = CAT_EMOJIS[listing.category ?? ""] ?? "🌱";
  return (
    <Card style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.sm + 4 }}>
      <View style={styles.thumbWrap}>
        {listing.photoUrl ? <Image source={{ uri: listing.photoUrl }} style={styles.thumb} /> : <Text style={{ fontSize: 26 }}>{emoji}</Text>}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.listingName} numberOfLines={1}>{listing.name}</Text>
        {listing.description ? <Text style={styles.listingDesc} numberOfLines={1}>{listing.description}</Text> : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          <Text style={styles.listingPrice}>₹{listing.price}</Text>
          <Text style={styles.listingUnit}>/ {listing.unit}</Text>
          {listing.qtyAvailable > 0 ? <Text style={styles.listingQty}>{listing.qtyAvailable} avail.</Text> : null}
        </View>
        {onVendorTap ? (
          <Pressable onPress={onVendorTap} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
            <Store size={10} color={colors.textMuted} />
            <Text style={styles.vendorLine} numberOfLines={1}>{vendorName} · {vendorLocation}</Text>
          </Pressable>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
            <MapPin size={10} color={colors.textMuted} />
            <Text style={styles.vendorLine} numberOfLines={1}>{vendorLocation}</Text>
          </View>
        )}
      </View>
      <View style={{ alignItems: "center", justifyContent: "center", gap: 3 }}>
        <Pressable style={styles.callBtn} onPress={onContact}>
          <Phone size={12} color="#fff" />
          <Text style={styles.callBtnText}>Call</Text>
        </Pressable>
        <Text style={styles.callSub} numberOfLines={1}>{vendorPhone}</Text>
      </View>
    </Card>
  );
}

function VendorDetail({ vendor, onBack, onContact }: { vendor: NurseryVendor; onBack: () => void; onContact: () => void }) {
  const qc = useQueryClient();
  const [myRating, setMyRating] = useState(0);
  const [comment, setComment] = useState("");

  const detailQuery = useQuery({
    queryKey: ["nursery-vendor-detail", vendor.id],
    queryFn: () => getNurseryVendorDetail(vendor.id),
  });

  const rateMutation = useMutation({
    mutationFn: () => submitNurseryRating(vendor.id, myRating, comment.trim() || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nursery-vendor-detail", vendor.id] });
      qc.invalidateQueries({ queryKey: ["nursery-vendors"] });
      setMyRating(0);
      setComment("");
    },
  });

  const detail = detailQuery.data;
  const listings = detail?.listings ?? [];
  const ratings = detail?.ratings ?? [];
  const avgRating = detail?.avgRating ?? vendor.avgRating ?? 0;
  const ratingCount = detail?.ratingCount ?? vendor.ratingCount ?? 0;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Pressable onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <ArrowLeft size={16} color={colors.primary} />
        <Text style={styles.backText}>All Vendors</Text>
      </Pressable>

      <View style={styles.vendorHero}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
          <View style={styles.vendorHeroIcon}>
            {vendor.photoUrl ? <Image source={{ uri: vendor.photoUrl }} style={styles.vendorHeroImg} /> : <Store size={22} color="rgba(255,255,255,0.85)" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vendorHeroName}>{vendor.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
              <StarRow value={avgRating} size={13} />
              <Text style={styles.vendorHeroSub}>{ratingCount > 0 ? `${avgRating} (${ratingCount})` : "No ratings yet"}</Text>
            </View>
            {vendor.speciality ? <Text style={styles.vendorHeroSub}>🌿 {vendor.speciality}</Text> : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <MapPin size={11} color="rgba(255,255,255,0.8)" />
              <Text style={styles.vendorHeroSub}>{vendor.location}</Text>
            </View>
          </View>
          <Pressable style={styles.contactBtn} onPress={onContact}>
            <Phone size={13} color={colors.primary} />
            <Text style={styles.contactBtnText}>Contact</Text>
          </Pressable>
        </View>
        {vendor.description ? <Text style={styles.vendorHeroDesc}>{vendor.description}</Text> : null}
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Rate this nursery</Text>
        <View style={{ flexDirection: "row", gap: 6, marginTop: spacing.sm }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Pressable key={i} onPress={() => setMyRating(i)}>
              <Star size={28} color={i <= myRating ? "#F5B93F" : colors.border} fill={i <= myRating ? "#F5B93F" : colors.border} />
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.commentInput}
          value={comment}
          onChangeText={setComment}
          placeholder="Share your experience (optional)"
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <Button
          title={rateMutation.isPending ? "Submitting..." : "Submit Rating"}
          onPress={() => rateMutation.mutate()}
          disabled={myRating === 0 || rateMutation.isPending}
        />
      </Card>

      {ratings.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionLabel}>REVIEWS ({ratings.length})</Text>
          {ratings.map((r) => (
            <Card key={r.id} style={{ padding: spacing.sm + 4 }}>
              <StarRow value={r.rating} size={12} />
              {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
            </Card>
          ))}
        </View>
      ) : null}

      {detailQuery.isLoading ? (
        <LoadingView label="Loading..." />
      ) : listings.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
          <Sprout size={36} color={colors.border} />
          <Text style={styles.emptyText}>No plants listed yet</Text>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionLabel}>{listings.length} PLANTS AVAILABLE</Text>
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              vendorName={vendor.name}
              vendorLocation={vendor.location}
              vendorPhone={vendor.phone}
              onContact={onContact}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ContactSheet({ vendor, onClose }: { vendor: NurseryVendor; onClose: () => void }) {
  const wa = (vendor.whatsapp ?? "").replace(/\D/g, "");
  return (
    <View style={styles.sheetOverlay}>
      <View style={styles.sheet}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.sheetTitle}>{vendor.name}</Text>
          <Pressable onPress={onClose}><X size={20} color={colors.textMuted} /></Pressable>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <MapPin size={13} color={colors.textMuted} />
          <Text style={styles.sheetLocation}>{vendor.location}</Text>
        </View>
        <Pressable style={styles.sheetCallBtn} onPress={() => Linking.openURL(`tel:${vendor.phone}`)}>
          <Phone size={18} color="#fff" />
          <Text style={styles.sheetCallText}>Call {vendor.phone}</Text>
        </Pressable>
        {vendor.whatsapp ? (
          <Pressable style={styles.sheetWaBtn} onPress={() => Linking.openURL(`https://wa.me/${wa.length === 10 ? "91" + wa : wa}`)}>
            <Text style={{ fontSize: 18 }}>💬</Text>
            <Text style={styles.sheetCallText}>WhatsApp {vendor.whatsapp}</Text>
          </Pressable>
        ) : null}
        <Text style={styles.sheetFooter}>Tell them you found them on Chiguru app</Text>
      </View>
    </View>
  );
}

export function NurseryScreen() {
  const [catFilter, setCatFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<NurseryVendor | null>(null);
  const [contactVendor, setContactVendor] = useState<NurseryVendor | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const vendorsQuery = useQuery({ queryKey: ["nursery-vendors"], queryFn: getNurseryVendors });
  const listingsQuery = useQuery({
    queryKey: ["nursery-listings", catFilter, selectedVendor?.id],
    queryFn: () => getNurseryListings(catFilter === "All" ? undefined : catFilter, selectedVendor?.id),
  });

  const vendors = vendorsQuery.data ?? [];
  const listings = listingsQuery.data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return listings;
    const q = search.trim().toLowerCase();
    return listings.filter(
      (l) => l.name.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q) || (l.vendorName ?? "").toLowerCase().includes(q)
    );
  }, [listings, search]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([vendorsQuery.refetch(), listingsQuery.refetch()]);
    setRefreshing(false);
  }

  if (selectedVendor) {
    return (
      <View style={styles.container}>
        <VendorDetail vendor={selectedVendor} onBack={() => setSelectedVendor(null)} onContact={() => setContactVendor(selectedVendor)} />
        {contactVendor ? <ContactSheet vendor={contactVendor} onClose={() => setContactVendor(null)} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.searchWrap}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search plants, trees, seedlings…"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {NURSERY_CATS.map((c) => (
              <Pressable key={c.key} style={[styles.chip, catFilter === c.key && styles.chipActive]} onPress={() => setCatFilter(c.key)}>
                <Text style={[styles.chipText, catFilter === c.key && styles.chipTextActive]}>{c.emoji} {c.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {catFilter === "All" && !search.trim() ? (
          <View>
            <Text style={styles.sectionTitle}>🏪 Nursery Vendors</Text>
            {vendorsQuery.isLoading ? (
              <LoadingView label="Loading vendors..." />
            ) : vendors.length === 0 ? (
              <Card style={{ alignItems: "center", padding: spacing.lg }}>
                <Sprout size={30} color={colors.primary} style={{ opacity: 0.3 }} />
                <Text style={styles.vendorEmptyTitle}>No vendors yet</Text>
                <Text style={styles.vendorEmptySub}>Be the first to register your nursery!</Text>
              </Card>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  {vendors.map((v, idx) => {
                    const isTopRated = idx === 0 && (v.ratingCount ?? 0) > 0 && (v.avgRating ?? 0) >= 4;
                    return (
                      <Pressable key={v.id} style={styles.vendorCard} onPress={() => setSelectedVendor(v)}>
                        {isTopRated ? (
                          <View style={styles.topBadge}>
                            <Star size={8} color="#B45309" fill="#B45309" />
                            <Text style={styles.topBadgeText}>TOP</Text>
                          </View>
                        ) : null}
                        <View style={styles.vendorCardIcon}>
                          {v.photoUrl ? <Image source={{ uri: v.photoUrl }} style={styles.vendorCardImg} /> : <Store size={18} color={colors.primary} />}
                        </View>
                        <Text style={styles.vendorCardName} numberOfLines={1}>{v.name}</Text>
                        {(v.ratingCount ?? 0) > 0 ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
                            <StarRow value={v.avgRating ?? 0} size={10} />
                            <Text style={styles.vendorCardRatingCount}>({v.ratingCount})</Text>
                          </View>
                        ) : (
                          <Text style={styles.vendorCardNoRating}>No ratings yet</Text>
                        )}
                        {v.speciality ? <Text style={styles.vendorCardSpeciality} numberOfLines={1}>{v.speciality}</Text> : null}
                        <Text style={styles.vendorCardLocation} numberOfLines={1}>📍 {v.location}</Text>
                        <Text style={styles.vendorCardCount}>{v.listingCount ?? 0} plants</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        ) : null}

        {listingsQuery.isLoading ? (
          <LoadingView label="Loading plants..." />
        ) : filtered.length === 0 && (catFilter !== "All" || search.trim()) ? (
          <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
            <Sprout size={36} color={colors.border} />
            <Text style={styles.emptyText}>No plants found</Text>
          </View>
        ) : filtered.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>{catFilter !== "All" ? catFilter : "All Plants"} · {filtered.length} listed</Text>
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {filtered.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  vendorName={l.vendorName ?? ""}
                  vendorLocation={l.vendorLocation ?? ""}
                  vendorPhone={l.vendorPhone ?? ""}
                  onVendorTap={() => {
                    const v = vendors.find((vv) => vv.id === l.vendorId);
                    if (v) setSelectedVendor(v);
                  }}
                  onContact={() => {
                    const v = vendors.find((vv) => vv.id === l.vendorId);
                    if (v) setContactVendor(v);
                    else if (l.vendorPhone) Linking.openURL(`tel:${l.vendorPhone}`);
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
      {contactVendor ? <ContactSheet vendor={contactVendor} onClose={() => setContactVendor(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  searchWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.sm + 4, height: 44 },
  searchInput: { flex: 1, fontSize: 13.5, color: colors.text },

  chip: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.sm + 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "700" },

  sectionTitle: { fontSize: 13.5, fontWeight: "700", color: colors.text },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.4 },

  vendorEmptyTitle: { fontSize: 13, fontWeight: "700", color: colors.primary, marginTop: spacing.xs },
  vendorEmptySub: { fontSize: 11.5, color: colors.primary, marginTop: 2, textAlign: "center" },

  vendorCard: { width: 148, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm + 4 },
  topBadge: { position: "absolute", top: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#FEF3C7", borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2 },
  topBadgeText: { fontSize: 8, fontWeight: "700", color: "#B45309" },
  vendorCardIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: spacing.xs },
  vendorCardImg: { width: "100%", height: "100%" },
  vendorCardName: { fontSize: 12, fontWeight: "700", color: colors.text },
  vendorCardRatingCount: { fontSize: 9, color: colors.textMuted },
  vendorCardNoRating: { fontSize: 9, color: colors.border, marginTop: 2 },
  vendorCardSpeciality: { fontSize: 10, color: colors.primary, marginTop: 2 },
  vendorCardLocation: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  vendorCardCount: { fontSize: 11.5, color: colors.primary, fontWeight: "700", marginTop: spacing.xs },

  thumbWrap: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  thumb: { width: "100%", height: "100%" },
  listingName: { fontSize: 13.5, fontWeight: "700", color: colors.text },
  listingDesc: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  listingPrice: { fontSize: 13.5, fontWeight: "700", color: colors.primary },
  listingUnit: { fontSize: 11, color: colors.textMuted },
  listingQty: { fontSize: 11, color: "#2563EB", fontWeight: "600" },
  vendorLine: { fontSize: 10, color: colors.textMuted },
  callBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2 },
  callBtnText: { color: "#fff", fontSize: 11.5, fontWeight: "700" },
  callSub: { fontSize: 8.5, color: colors.textMuted, maxWidth: 56, textAlign: "center" },

  backText: { fontSize: 13.5, fontWeight: "700", color: colors.primary },
  vendorHero: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md },
  vendorHeroIcon: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  vendorHeroImg: { width: "100%", height: "100%" },
  vendorHeroName: { color: "#fff", fontSize: 17, fontWeight: "700" },
  vendorHeroSub: { color: "rgba(255,255,255,0.8)", fontSize: 11.5, marginTop: 1 },
  vendorHeroDesc: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: spacing.sm, lineHeight: 17 },
  contactBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#fff", borderRadius: radius.sm, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 4 },
  contactBtnText: { color: colors.primary, fontSize: 11.5, fontWeight: "700" },

  commentInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, fontSize: 13, color: colors.text, minHeight: 56, marginTop: spacing.sm, marginBottom: spacing.sm, textAlignVertical: "top" },
  reviewComment: { fontSize: 13, color: colors.text, marginTop: 6 },

  emptyText: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm },

  sheetOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  sheetLocation: { fontSize: 12.5, color: colors.textMuted },
  sheetCallBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md },
  sheetWaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: "#25D366", borderRadius: radius.lg, paddingVertical: spacing.md },
  sheetCallText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  sheetFooter: { fontSize: 11, color: colors.textMuted, textAlign: "center" },
});
