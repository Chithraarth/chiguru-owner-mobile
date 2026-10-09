import React, { useState } from "react";
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Megaphone, Pencil, Tag, Trash2, Truck, HardHat, ShoppingBasket, Tractor, Sprout } from "lucide-react-native";
import { BigTiles } from "../../../components/harvest";
import { colors, radius, spacing, shadow } from "../../../components/theme";
import { useT } from "../../../lib/i18n";
import { getMyProduceListings, deleteProduceListing } from "../../../api/endpoints/marketplace";
import { getMyEquipmentListings, deleteEquipmentListing } from "../../../api/endpoints/equipment";
import { getMyHireListings, deleteHireListing } from "../../../api/endpoints/hire";
import type { EquipmentListing, HireListing, ProduceListing } from "../../../types/api";

function getPostOptions(t: (key: string) => string) {
  return [
    { icon: Truck, label: t("myAds.postMachine"), screen: "HireForm", params: { listingType: "rental" } },
    { icon: HardHat, label: t("myAds.postWorker"), screen: "HireForm", params: { listingType: "job" } },
    { icon: ShoppingBasket, label: t("myAds.sellProduce"), screen: "MarketplaceForm", params: undefined },
    { icon: Tractor, label: t("myAds.sellEquipment"), screen: "EquipmentForm", params: undefined },
    { icon: Sprout, label: t("myAds.sellPlants"), screen: "Nursery", params: undefined },
  ];
}

function AdCard({
  photoUrl,
  title,
  subtitle,
  location,
  onDelete,
  onEdit,
}: {
  photoUrl: string | null;
  title: string;
  subtitle: string;
  location?: string;
  onDelete: () => void;
  onEdit?: () => void;
}) {
  const { t } = useT();
  function confirmDelete() {
    Alert.alert("Delete this ad?", undefined, [
      { text: t("scan.cancel"), style: "cancel" },
      { text: "Yes, delete", style: "destructive", onPress: onDelete },
    ]);
  }

  return (
    <View style={styles.adCard}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.adPhoto} />
      ) : (
        <View style={styles.adPhotoPlaceholder}>
          <Tag size={18} color={colors.border} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.adTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.adSubtitle}>{subtitle}</Text>
        {location ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <MapPin size={10} color={colors.textMuted} />
            <Text style={styles.adLocation} numberOfLines={1}>{location}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {onEdit ? (
          <Pressable style={styles.iconBtn} onPress={onEdit}>
            <Pencil size={15} color={colors.primary} />
          </Pressable>
        ) : null}
        <Pressable style={[styles.iconBtn, { backgroundColor: "#FDEAEA" }]} onPress={confirmDelete}>
          <Trash2 size={15} color={colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function MyAdsScreen({ navigation }: { navigation: any }) {
  const { t } = useT();
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const postOptions = getPostOptions(t);

  const produceQuery = useQuery({ queryKey: ["my-produce"], queryFn: getMyProduceListings });
  const equipmentQuery = useQuery({ queryKey: ["my-equipment"], queryFn: getMyEquipmentListings });
  const hireQuery = useQuery({ queryKey: ["my-hire"], queryFn: getMyHireListings });

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([produceQuery.refetch(), equipmentQuery.refetch(), hireQuery.refetch()]);
    setRefreshing(false);
  }

  const hireAds: HireListing[] = hireQuery.data ?? [];
  const rentals = hireAds.filter((l) => l.listingType === "rental");
  const jobs = hireAds.filter((l) => l.listingType === "job");
  const produceAds: ProduceListing[] = produceQuery.data ?? [];
  const equipmentAds: EquipmentListing[] = equipmentQuery.data ?? [];

  const isLoading = produceQuery.isLoading || equipmentQuery.isLoading || hireQuery.isLoading;
  const total = hireAds.length + produceAds.length + equipmentAds.length;

  async function deleteHire(id: number) {
    await deleteHireListing(id);
    queryClient.invalidateQueries({ queryKey: ["my-hire"] });
  }
  async function deleteProduce(id: number) {
    await deleteProduceListing(id);
    queryClient.invalidateQueries({ queryKey: ["my-produce"] });
  }
  async function deleteEquipment(id: number) {
    await deleteEquipmentListing(id);
    queryClient.invalidateQueries({ queryKey: ["my-equipment"] });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.hero}>
        <View style={styles.heroIconWrap}>
          <Megaphone size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>{t("menu.myAds")}</Text>
          <Text style={styles.heroSubtitle}>{t("myAds.subtitle")}</Text>
        </View>
      </View>

      <Text style={styles.chooseLabel}>{t("myAds.chooseType")}</Text>
      <BigTiles
        columns={3}
        items={postOptions.map((o) => ({ icon: o.icon, title: o.label, onPress: () => navigation.navigate(o.screen, o.params) }))}
      />

      {isLoading ? null : total === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
          <Megaphone size={36} color={colors.border} />
          <Text style={{ color: colors.textMuted, marginTop: spacing.sm, fontSize: 14.5 }}>{t("myAds.empty")}</Text>
        </View>
      ) : (
        <View style={{ gap: spacing.lg }}>
          {jobs.length > 0 ? (
            <Section title={`${t("myAds.workerAds")}`}>
              {jobs.map((l) => (
                <AdCard
                  key={l.id}
                  photoUrl={l.photoUrl}
                  title={l.title}
                  subtitle={[l.rate, l.workersNeeded ? `${l.workersNeeded} needed` : null].filter(Boolean).join(" · ") || "Worker needed"}
                  location={[l.village, l.taluk, l.district].filter(Boolean).join(", ")}
                  onDelete={() => deleteHire(l.id)}
                  onEdit={() => navigation.navigate("HireForm", { listingType: l.listingType, listing: l })}
                />
              ))}
            </Section>
          ) : null}
          {rentals.length > 0 ? (
            <Section title={`${t("myAds.machineAds")}`}>
              {rentals.map((l) => (
                <AdCard
                  key={l.id}
                  photoUrl={l.photoUrl}
                  title={l.title}
                  subtitle={l.rate ?? "Machine for rent"}
                  location={[l.village, l.taluk, l.district].filter(Boolean).join(", ")}
                  onDelete={() => deleteHire(l.id)}
                  onEdit={() => navigation.navigate("HireForm", { listingType: l.listingType, listing: l })}
                />
              ))}
            </Section>
          ) : null}
          {produceAds.length > 0 ? (
            <Section title={`${t("myAds.produceAds")}`}>
              {produceAds.map((l) => (
                <AdCard
                  key={l.id}
                  photoUrl={l.photoUrl}
                  title={l.productName}
                  subtitle={`₹${l.price} / ${l.unit}${l.quantity ? ` · ${l.quantity}` : ""}`}
                  location={l.location}
                  onDelete={() => deleteProduce(l.id)}
                />
              ))}
            </Section>
          ) : null}
          {equipmentAds.length > 0 ? (
            <Section title={`${t("myAds.equipmentAds")}`}>
              {equipmentAds.map((l) => (
                <AdCard
                  key={l.id}
                  photoUrl={l.photoUrl}
                  title={l.title}
                  subtitle={`₹${l.price} · ${l.condition === "new" ? "New" : "Used"}`}
                  location={l.location}
                  onDelete={() => deleteEquipment(l.id)}
                />
              ))}
            </Section>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  hero: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.accent, borderRadius: 28, padding: spacing.md },
  heroIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: colors.accentInk, fontSize: 18, fontWeight: "800" },
  heroSubtitle: { color: colors.accentInkSoft, fontSize: 14, marginTop: 2 },

  chooseLabel: { fontSize: 20, fontWeight: "800", color: colors.text },
  postOption: { flex: 1, borderRadius: radius.md, alignItems: "center", paddingVertical: spacing.sm + 4, paddingHorizontal: 3, gap: 4 },
  postOptionText: { fontSize: 11.5, fontWeight: "600", color: colors.text, textAlign: "center", lineHeight: 12 },

  sectionTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  adCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.card, ...shadow, borderRadius: 22, padding: spacing.sm + 4 },
  adPhoto: { width: 52, height: 52, borderRadius: radius.sm },
  adPhotoPlaceholder: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
  adTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  adSubtitle: { fontSize: 14, color: colors.primary, fontWeight: "600", marginTop: 1 },
  adLocation: { fontSize: 13, color: colors.textMuted },
  iconBtn: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: "#FFF0C2", alignItems: "center", justifyContent: "center" },
});
