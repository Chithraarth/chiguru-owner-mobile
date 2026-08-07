import React from "react";
import * as WebBrowser from "expo-web-browser";
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Crown,
  Landmark,
  Lock,
  MapPinned,
  PartyPopper,
  Share2,
  Smartphone,
  Sprout,
} from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import {
  cancelAutoRenew,
  checkoutDeviceAddon,
  checkoutEstateAddon,
  checkoutPlan,
  getPayments,
  getPlans,
  getSubscription,
  shareToEarn,
} from "../../../api/endpoints/subscription";
import type { SubscriptionPlan } from "../../../types/api";

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const SHARE_TARGET = 3;
const SHARE_MESSAGE = "I'm running my farm on Chiguru — attendance, expenses, harvest and Agri Doctor, all in one app. Try it:";
const SHARE_LINK = "https://thechiguru.com";

interface ShareOption {
  id: string;
  label: string;
  url: ((text: string, link: string) => string) | null;
}
const SHARE_OPTIONS: ShareOption[] = [
  { id: "whatsapp", label: "WhatsApp", url: (t, l) => `https://wa.me/?text=${encodeURIComponent(`${t} ${l}`)}` },
  { id: "facebook", label: "Facebook", url: (_t, l) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(l)}` },
  { id: "x", label: "X (Twitter)", url: (t, l) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(l)}` },
  { id: "telegram", label: "Telegram", url: (t, l) => `https://t.me/share/url?url=${encodeURIComponent(l)}&text=${encodeURIComponent(t)}` },
  { id: "other", label: "Instagram / more", url: null },
];

function PlanIcon({ plan }: { plan: SubscriptionPlan }) {
  if (plan.id === "farmer") return <Sprout size={20} color={colors.primary} />;
  if (plan.id === "planter") return <Smartphone size={20} color="#2F9E67" />;
  return <Landmark size={20} color="#B7791F" />;
}

function AutoPayNote() {
  return <Text style={styles.autoPayNote}>Renews automatically each month until cancelled.</Text>;
}

export function SubscriptionScreen() {
  const queryClient = useQueryClient();

  const plansQuery = useQuery({ queryKey: ["subscription-plans"], queryFn: getPlans });
  const subQuery = useQuery({ queryKey: ["subscription"], queryFn: getSubscription });
  const paymentsQuery = useQuery({ queryKey: ["payments"], queryFn: getPayments });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["subscription"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
  };

  const openCheckout = async (res: { url: string } | null) => {
    if (res?.url) {
      await WebBrowser.openBrowserAsync(res.url);
      invalidateAll();
    } else {
      Alert.alert("Couldn't start checkout", "Please try again.");
    }
  };

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) => checkoutPlan(planId),
    onSuccess: openCheckout,
  });
  const estateAddonMutation = useMutation({
    mutationFn: checkoutEstateAddon,
    onSuccess: openCheckout,
  });
  const deviceAddonMutation = useMutation({
    mutationFn: checkoutDeviceAddon,
    onSuccess: openCheckout,
  });
  const cancelMutation = useMutation({
    mutationFn: cancelAutoRenew,
    onSuccess: () => {
      Alert.alert("Auto-renew cancelled", "Your plan stays active until the current period ends.");
      invalidateAll();
    },
  });
  const shareMutation = useMutation({
    mutationFn: (platform: string) => shareToEarn(platform),
    onSuccess: (res) => {
      invalidateAll();
      if (res?.rewardGranted) {
        Alert.alert("1 month free!", "Your reward has been applied — thanks for spreading the word about Chiguru.");
      }
    },
    onError: () => Alert.alert("Couldn't record your share", "Please try again."),
  });

  if (plansQuery.isLoading || subQuery.isLoading) return <LoadingView label="Loading plans..." />;

  const plans = plansQuery.data?.plans ?? [];
  const current = subQuery.data?.subscription ?? null;
  const isActive = current?.status === "active";
  const sharePlatforms = subQuery.data?.sharePlatforms ?? "";
  const shared = new Set(sharePlatforms.split(",").filter(Boolean));
  const shareClaimed = !!subQuery.data?.shareRewardClaimedAt;
  const shareCount = Math.min(shared.size, SHARE_TARGET);
  const freeMonthPending = !!subQuery.data?.freeMonthPending;

  async function onShare(opt: ShareOption) {
    if (opt.url) {
      await Linking.openURL(opt.url(SHARE_MESSAGE, SHARE_LINK));
    } else {
      try {
        await Share.share({ message: `${SHARE_MESSAGE} ${SHARE_LINK}` });
      } catch {
        return;
      }
    }
    shareMutation.mutate(opt.id);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      {isActive ? (
        <View style={styles.statusCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Crown size={18} color="#fff" />
            <Text style={styles.statusTitle}>{current!.planName} plan active</Text>
          </View>
          <Text style={styles.statusDesc}>Your farm is fully active — everything is unlocked, including selling on Chiguru.</Text>
          {current!.renewalDate ? (
            <Text style={styles.statusMeta}>Renews on {fmtDate(current!.renewalDate)}</Text>
          ) : null}
          <View style={{ marginTop: spacing.sm }}>
            <Button title="Cancel auto-renew" variant="secondary" onPress={() => cancelMutation.mutate()} loading={cancelMutation.isPending} />
          </View>
        </View>
      ) : (
        <View style={styles.statusCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Lock size={18} color="#fff" />
            <Text style={styles.statusTitle}>Subscribe to unlock</Text>
          </View>
          <Text style={styles.statusDesc}>Pick a plan below to run your whole farm — attendance, expenses, harvest, Agri Doctor and selling on Chiguru.</Text>
        </View>
      )}

      {/* Share on 3 apps → 1 month free */}
      <Card style={styles.shareCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          {shareClaimed ? <PartyPopper size={18} color="#2F9E67" /> : <Share2 size={18} color="#2F9E67" />}
          <Text style={styles.shareTitle}>{shareClaimed ? "Free month claimed!" : "Share on 3 apps → 1 month FREE"}</Text>
        </View>
        {shareClaimed ? (
          <Text style={styles.shareDesc}>
            Thanks for sharing Chiguru{current?.renewalDate ? ` — your plan is active till ${fmtDate(current.renewalDate)}` : freeMonthPending ? ". Your free month will apply the moment you pick a plan below." : "."}
          </Text>
        ) : (
          <>
            <Text style={styles.shareDesc}>
              Post about Chiguru on any 3 different apps — WhatsApp, Facebook, Instagram, X, TikTok or others — and get 1 month of your plan free.
            </Text>
            <View style={styles.shareDots}>
              {Array.from({ length: SHARE_TARGET }).map((_, i) => (
                <View key={i} style={[styles.shareDot, i < shareCount && styles.shareDotFilled]} />
              ))}
              <Text style={styles.shareProgress}>{shareCount}/{SHARE_TARGET} shared</Text>
            </View>
            <View style={styles.shareChips}>
              {SHARE_OPTIONS.map((opt) => {
                const done = shared.has(opt.id);
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => onShare(opt)}
                    disabled={shareMutation.isPending}
                    style={[styles.shareChip, done && styles.shareChipDone]}
                  >
                    <Text style={[styles.shareChipText, done && styles.shareChipTextDone]}>{done ? "✓ " : ""}{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </Card>

      <View style={styles.honestCard}>
        <Text style={styles.honestTitle}>Simple, honest prices</Text>
        <Text style={styles.honestDesc}>Every plan runs your whole farm — everything included. Just pick the size that fits: Farmer, Planter or Company Estate.</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {plans.map((plan) => {
          const isCurrent = isActive && current?.planName === plan.name;
          const isFarmer = plan.id === "farmer";
          const features = [
            "Attendance + AI count",
            "Advances + loans",
            "Profit / loss",
            "Agri Doctor",
            "Sell + works offline",
            plan.maxEstates == null ? "Unlimited estates" : `${plan.maxEstates} estate${plan.maxEstates > 1 ? "s" : ""} included`,
            `${plan.maxManagerDevices} manager device${plan.maxManagerDevices > 1 ? "s" : ""} included`,
          ];
          return (
            <View key={plan.id} style={[styles.planCard, isCurrent ? styles.planCardCurrent : isFarmer && styles.planCardBest]}>
              <View style={[styles.planBadge, (isCurrent || isFarmer) && styles.planBadgeHighlight]}>
                <Text style={[styles.planBadgeText, (isCurrent || isFarmer) && styles.planBadgeTextHighlight]}>
                  {isCurrent ? "CURRENT" : isFarmer ? "BEST VALUE" : plan.id === "planter" ? "FOR PLANTATIONS" : "FOR COMPANIES"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm }}>
                <View style={styles.planIconWrap}><PlanIcon plan={plan} /></View>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planTagline} numberOfLines={2}>{plan.tagline}</Text>
                </View>
              </View>
              <Text style={styles.planPrice}>{inr(plan.amount)}</Text>
              <Text style={styles.planPerMonth}>per month</Text>
              <View style={{ gap: 5, marginTop: spacing.sm }}>
                {features.map((f) => (
                  <View key={f} style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
                    <Check size={13} color={colors.primary} style={{ marginTop: 2 }} />
                    <Text style={styles.planFeature}>{f}</Text>
                  </View>
                ))}
              </View>
              <View style={{ marginTop: spacing.md }}>
                <Button
                  title={isCurrent ? "Current plan" : "Choose"}
                  disabled={checkoutMutation.isPending || isCurrent}
                  loading={checkoutMutation.isPending}
                  onPress={() => checkoutMutation.mutate(plan.id)}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View>
        <Text style={styles.sectionTitle}>Add-ons — grow beyond your plan</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <View style={[styles.addonIconWrap, { backgroundColor: "#E6F5EC" }]}>
                <MapPinned size={18} color="#2F9E67" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addonTitle}>Extra estate add-on</Text>
                <Text style={styles.addonSub}>Add one more estate on top of your plan</Text>
              </View>
            </View>
            <Text style={styles.addonPrice}>{inr(plansQuery.data?.estateAddon.amount ?? 199)} <Text style={styles.addonPriceUnit}>per month, each</Text></Text>
            {(current?.extraEstates ?? 0) > 0 ? (
              <Text style={styles.addonOwned}>You have {current?.extraEstates} extra estate add-on{(current?.extraEstates ?? 0) > 1 ? "s" : ""}</Text>
            ) : null}
            <AutoPayNote />
            <View style={{ marginTop: spacing.sm }}>
              <Button
                title="Add an estate"
                onPress={() => estateAddonMutation.mutate()}
                loading={estateAddonMutation.isPending}
                variant="secondary"
              />
            </View>
          </Card>

          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <View style={[styles.addonIconWrap, { backgroundColor: "#E3E0EC" }]}>
                <Smartphone size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addonTitle}>Extra manager device add-on</Text>
                <Text style={styles.addonSub}>Add one more manager phone on top of your plan</Text>
              </View>
            </View>
            <Text style={styles.addonPrice}>{inr(plansQuery.data?.managerDeviceAddon.amount ?? 199)} <Text style={styles.addonPriceUnit}>per month, each</Text></Text>
            <AutoPayNote />
            <View style={{ marginTop: spacing.sm }}>
              <Button
                title="Add a device"
                onPress={() => deviceAddonMutation.mutate()}
                loading={deviceAddonMutation.isPending}
              />
            </View>
          </Card>
        </View>
      </View>

      <Card style={{ gap: spacing.sm }}>
        <Text style={styles.whyTitle}>Why do we charge this money?</Text>
        <Text style={styles.whyText}>
          Your plan runs your whole farm: attendance with AI face recognition, employee pay and advances, expenses, harvest, profit & loss, Agri Doctor, selling on Chiguru — and it all works offline.
        </Text>
        <Text style={styles.whyText}>
          The AI features cost us real money. Our technology partners charge us for every photo the AI checks — every face marked in attendance and every crop photo Agri Doctor looks at. Your subscription pays those bills.
        </Text>
        <Text style={styles.whyText}>
          We make little to no profit from this. Chiguru exists to help farmers and planters improve their farms — better records, better growth, better yield. Farming builds so many lives, and we are here to help it grow.
        </Text>
      </Card>

      <View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm }}>
          <Text style={styles.sectionTitle}>Payment history</Text>
        </View>
        {(paymentsQuery.data?.length ?? 0) === 0 ? (
          <Card style={{ alignItems: "center" }}>
            <Text style={styles.emptyText}>No payments yet.</Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {paymentsQuery.data?.map((p) => (
              <Card key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={styles.paymentAmount}>{inr(Number(p.amount))}</Text>
                  <Text style={styles.paymentDate}>{new Date(p.createdAt).toLocaleDateString("en-IN")}</Text>
                </View>
                <View style={[styles.statusBadge, p.paymentStatus === "succeeded" ? { backgroundColor: "#E3E0EC" } : { backgroundColor: "#FDEAEA" }]}>
                  <Text style={[styles.statusBadgeText, { color: p.paymentStatus === "succeeded" ? colors.primary : colors.danger }]}>{p.paymentStatus}</Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  statusCard: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md },
  statusTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  statusDesc: { color: "rgba(255,255,255,0.85)", fontSize: 12.5, marginTop: spacing.xs, lineHeight: 17 },
  statusMeta: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: spacing.sm },

  shareCard: { borderColor: "#BEE6CD", backgroundColor: "#F0FBF4" },
  shareTitle: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  shareDesc: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 16 },
  shareDots: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing.sm },
  shareDot: { height: 8, width: 30, borderRadius: 4, backgroundColor: "#CFEFDA" },
  shareDotFilled: { backgroundColor: "#2F9E67" },
  shareProgress: { marginLeft: 4, fontSize: 11.5, fontWeight: "700", color: "#2F9E67" },
  shareChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  shareChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm + 2, borderRadius: radius.pill, borderWidth: 1, borderColor: "#D8D5E0", backgroundColor: "#fff" },
  shareChipDone: { backgroundColor: "#2F9E67", borderColor: "#2F9E67" },
  shareChipText: { fontSize: 12.5, fontWeight: "600", color: colors.text },
  shareChipTextDone: { color: "#fff" },

  honestCard: { backgroundColor: "#EFEDF7", borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: "#DDD8EC", alignItems: "center" },
  honestTitle: { fontSize: 14.5, fontWeight: "700", color: colors.primary, textAlign: "center" },
  honestDesc: { fontSize: 12, color: colors.primary, opacity: 0.8, marginTop: spacing.xs, textAlign: "center", lineHeight: 16 },

  planCard: { width: 260, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card, padding: spacing.md },
  planCardCurrent: { borderColor: colors.primary, backgroundColor: "#F5F4FA" },
  planCardBest: { borderColor: colors.primary },
  planBadge: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: colors.muted },
  planBadgeHighlight: { backgroundColor: colors.primary },
  planBadgeText: { fontSize: 9.5, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.3 },
  planBadgeTextHighlight: { color: "#fff" },
  planIconWrap: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
  planName: { fontSize: 15, fontWeight: "700", color: colors.text },
  planTagline: { fontSize: 10.5, color: colors.textMuted, marginTop: 1, width: 170 },
  planPrice: { fontSize: 26, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
  planPerMonth: { fontSize: 12, color: colors.textMuted },
  planFeature: { fontSize: 12, color: colors.text, flex: 1 },

  sectionTitle: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  addonIconWrap: { width: 38, height: 38, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  addonTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  addonSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  addonPrice: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
  addonPriceUnit: { fontSize: 12, fontWeight: "400", color: colors.textMuted },
  addonOwned: { fontSize: 11.5, color: "#2F9E67", fontWeight: "600", marginTop: 2 },
  autoPayNote: { fontSize: 11, color: colors.textMuted, marginTop: spacing.xs },

  whyTitle: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  whyText: { fontSize: 12, color: colors.text, lineHeight: 17 },

  emptyText: { fontSize: 13, color: colors.textMuted },
  paymentAmount: { fontSize: 14, fontWeight: "700", color: colors.text },
  paymentDate: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  statusBadge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
});
