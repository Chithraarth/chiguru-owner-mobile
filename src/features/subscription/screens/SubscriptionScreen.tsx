import React, { useEffect, useRef, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  initConnection,
  endConnection,
  requestSubscription,
  getSubscriptions,
  purchaseUpdatedListener,
  finishTransaction,
  deepLinkToSubscriptions,
  type Purchase,
  type SubscriptionPurchase,
  type SubscriptionAndroid,
} from "react-native-iap";
import {
  Check,
  Crown,
  Lock,
  PartyPopper,
  Share2,
  Sprout,
} from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing } from "../../../components/theme";
import {
  cancelSubscription,
  getPayments,
  getPlans,
  getSubscription,
  shareToEarn,
  verifyAndroidPurchase,
} from "../../../api/endpoints/subscription";
import { ApiError } from "../../../api/errors";
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

function PlanIcon() {
  return <Sprout size={20} color={colors.primary} />;
}

export function SubscriptionScreen() {
  const queryClient = useQueryClient();
  const [purchasingPlanId, setPurchasingPlanId] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);
  // A purchase can complete after this screen (or the whole app) has been
  // backgrounded — the listener must always see the *current* plan list to
  // resolve a productId back to our own plan id, not a stale closure's.
  const plansRef = useRef<SubscriptionPlan[]>([]);

  const plansQuery = useQuery({ queryKey: ["subscription-plans"], queryFn: getPlans });
  const subQuery = useQuery({ queryKey: ["subscription"], queryFn: getSubscription });
  const paymentsQuery = useQuery({ queryKey: ["payments"], queryFn: getPayments });

  const plans = plansQuery.data?.plans ?? [];
  plansRef.current = plans;

  // Play Billing v5+ requires the specific offerToken of the base plan/offer
  // being bought, not just the bare product id — fetched once the plan list
  // (and therefore the set of Google Play product ids) is known.
  const productIds = plans.map((p) => p.googlePlayProductId).filter((id): id is string => !!id);
  const offersQuery = useQuery({
    queryKey: ["google-play-offers", productIds],
    queryFn: async () => {
      const subs = await getSubscriptions({ skus: productIds });
      const tokenByProductId: Record<string, string> = {};
      for (const s of subs as SubscriptionAndroid[]) {
        const offerToken = s.subscriptionOfferDetails?.[0]?.offerToken;
        if (offerToken) tokenByProductId[s.productId] = offerToken;
      }
      return tokenByProductId;
    },
    enabled: productIds.length > 0,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["subscription"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
  };

  // Play Billing connection + purchase listener — set up once for the life of
  // this screen. A purchase's result never comes back from requestSubscription
  // itself; it always arrives here, asynchronously.
  useEffect(() => {
    let mounted = true;
    initConnection().catch((err: unknown) => console.warn("IAP initConnection failed", err));

    const sub = purchaseUpdatedListener(async (purchase: Purchase) => {
      const purchaseToken = (purchase as SubscriptionPurchase).purchaseToken;
      const productId = purchase.productId;
      if (!purchaseToken || !productId) return;

      if (mounted) setVerifying(true);
      try {
        const res = await verifyAndroidPurchase({ purchaseToken, productId });
        if (!res) {
          // Offline — apiMutate queued it; the purchase itself is already
          // done on Google's side, so don't finish/ack locally either. It'll
          // verify (and finishTransaction below) once connectivity returns
          // and this listener fires again on next launch's getAvailablePurchases.
          if (mounted) Alert.alert("Payment received", "You're offline — this will finish activating once you're back online.");
          return;
        }
        await finishTransaction({ purchase, isConsumable: false });
        invalidateAll();
        if (mounted) Alert.alert("Subscription active", "Your plan is now active.");
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Please contact support if this keeps happening.";
        if (mounted) Alert.alert("Couldn't verify your payment", msg);
      } finally {
        if (mounted) {
          setVerifying(false);
          setPurchasingPlanId(null);
        }
      }
    });

    return () => {
      mounted = false;
      sub.remove();
      endConnection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: (res) => {
      if (!res) {
        Alert.alert("Couldn't cancel", "You're offline — please try again once connected.");
        return;
      }
      Alert.alert("Subscription cancelled", "Your plan stays active until the current period ends.");
      invalidateAll();
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.is("MANAGE_VIA_GOOGLE_PLAY")) {
        // Google's own guidance: subscriptions bought via Play Billing are
        // managed from Play Store's own UI, not from inside the app.
        const currentPlanId = subQuery.data?.subscription?.plan?.id;
        const productId = plansRef.current.find((p) => p.id === currentPlanId)?.googlePlayProductId;
        deepLinkToSubscriptions({ sku: productId ?? undefined }).catch(() =>
          Alert.alert("Couldn't open Play Store", "Open the Play Store app and go to Subscriptions to manage this."),
        );
        return;
      }
      const msg = err instanceof ApiError ? err.message : "Please try again.";
      Alert.alert("Couldn't cancel", msg);
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

  const current = subQuery.data?.subscription ?? null;
  const isActive = current?.status === "ACTIVE" || current?.status === "GRACE_PERIOD";
  const sharePlatforms = subQuery.data?.sharePlatforms ?? "";
  const shared = new Set(sharePlatforms.split(",").filter(Boolean));
  const shareClaimed = !!subQuery.data?.shareRewardClaimedAt;
  const shareCount = Math.min(shared.size, SHARE_TARGET);
  const freeMonthPending = !!subQuery.data?.freeMonthPending;

  async function onChoosePlan(plan: SubscriptionPlan) {
    if (!plan.googlePlayProductId) {
      Alert.alert("Not available yet", "This plan isn't set up for purchase on Android yet.");
      return;
    }
    const offerToken = offersQuery.data?.[plan.googlePlayProductId];
    if (!offerToken) {
      Alert.alert("Not ready yet", "Still loading this plan's pricing — please try again in a moment.");
      return;
    }
    setPurchasingPlanId(plan.id);
    try {
      await requestSubscription({
        subscriptionOffers: [{ sku: plan.googlePlayProductId, offerToken }],
      });
      // Result arrives via purchaseUpdatedListener above, not here.
    } catch (err) {
      setPurchasingPlanId(null);
      // User closing Play Billing's own sheet also lands here — not a real error.
      const message = err instanceof Error ? err.message : "";
      if (!/cancel/i.test(message)) {
        Alert.alert("Couldn't start purchase", "Please try again.");
      }
    }
  }

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
            <Text style={styles.statusTitle}>{current!.plan?.name} plan active</Text>
          </View>
          <Text style={styles.statusDesc}>Your farm is fully active — everything is unlocked.</Text>
          {current!.expiryDate ? (
            <Text style={styles.statusMeta}>
              {current!.autoRenew ? `Renews on ${fmtDate(current!.expiryDate)}` : `Access continues until ${fmtDate(current!.expiryDate)}`}
            </Text>
          ) : null}
          {current!.autoRenew ? (
            <View style={{ marginTop: spacing.sm }}>
              <Button title="Cancel subscription" variant="secondary" onPress={() => cancelMutation.mutate()} loading={cancelMutation.isPending} />
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.statusCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Lock size={18} color="#fff" />
            <Text style={styles.statusTitle}>Subscribe to unlock</Text>
          </View>
          <Text style={styles.statusDesc}>Pick a plan below to run your whole farm and add managers.</Text>
        </View>
      )}

      {verifying ? (
        <Card style={{ backgroundColor: "#FFF8E6", borderColor: "#F0DFA6" }}>
          <Text style={{ color: "#8A6D1D", fontSize: 12.5 }}>Payment received. Verifying your subscription...</Text>
        </Card>
      ) : null}

      {/* Share on 3 apps → 1 month free */}
      <Card style={styles.shareCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          {shareClaimed ? <PartyPopper size={18} color="#2F9E67" /> : <Share2 size={18} color="#2F9E67" />}
          <Text style={styles.shareTitle}>{shareClaimed ? "Free month claimed!" : "Share on 3 apps → 1 month FREE"}</Text>
        </View>
        {shareClaimed ? (
          <Text style={styles.shareDesc}>
            Thanks for sharing Chiguru{isActive ? "." : freeMonthPending ? " — your free month applies the moment you pick a plan below." : "."}
          </Text>
        ) : (
          <>
            <Text style={styles.shareDesc}>
              Post about Chiguru on any 3 different apps — WhatsApp, Facebook, Instagram, X, TikTok or others — and get 1 month free.
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
        <Text style={styles.honestDesc}>Every plan runs your whole farm — everything included. Just pick the size that fits.</Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        {plans.map((plan) => {
          const isCurrent = isActive && current?.plan?.id === plan.id;
          const purchasing = purchasingPlanId === plan.id;
          return (
            <Card key={plan.id} style={isCurrent ? styles.planCardCurrent : undefined}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <View style={styles.planIconWrap}><PlanIcon /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  {plan.description ? <Text style={styles.planTagline} numberOfLines={2}>{plan.description}</Text> : null}
                </View>
              </View>
              <Text style={styles.planPrice}>{inr(plan.price)}</Text>
              <Text style={styles.planPerMonth}>per {plan.billingPeriod === "monthly" ? "month" : plan.billingPeriod}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm }}>
                <Check size={13} color={colors.primary} />
                <Text style={styles.planFeature}>{plan.managerLimit} manager{plan.managerLimit > 1 ? "s" : ""} included</Text>
              </View>
              <View style={{ marginTop: spacing.md }}>
                <Button
                  title={isCurrent ? "Current plan" : "Choose"}
                  disabled={purchasing || isCurrent || !plan.googlePlayProductId}
                  loading={purchasing}
                  onPress={() => onChoosePlan(plan)}
                />
              </View>
            </Card>
          );
        })}
      </View>

      <Card style={{ gap: spacing.sm }}>
        <Text style={styles.whyTitle}>Why do we charge this money?</Text>
        <Text style={styles.whyText}>
          Your plan runs your whole farm: attendance with AI face recognition, employee pay and advances, expenses, harvest, profit & loss, Agri Doctor, selling on Chiguru — and it all works offline.
        </Text>
        <Text style={styles.whyText}>
          The AI features cost us real money. Our technology partners charge us for every photo the AI checks. Your subscription pays those bills.
        </Text>
        <Text style={styles.whyText}>
          We make little to no profit from this. Chiguru exists to help farmers and planters improve their farms.
        </Text>
      </Card>

      <View>
        <Text style={styles.sectionTitle}>Payment history</Text>
        {(paymentsQuery.data?.length ?? 0) === 0 ? (
          <Card style={{ alignItems: "center", marginTop: spacing.sm }}>
            <Text style={styles.emptyText}>No payments yet.</Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
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

  planCardCurrent: { borderColor: colors.primary, backgroundColor: "#F5F4FA" },
  planIconWrap: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
  planName: { fontSize: 15, fontWeight: "700", color: colors.text },
  planTagline: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  planPrice: { fontSize: 26, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
  planPerMonth: { fontSize: 12, color: colors.textMuted },
  planFeature: { fontSize: 12, color: colors.text, flex: 1 },

  sectionTitle: { fontSize: 14.5, fontWeight: "700", color: colors.text },

  whyTitle: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  whyText: { fontSize: 12, color: colors.text, lineHeight: 17 },

  emptyText: { fontSize: 13, color: colors.textMuted },
  paymentAmount: { fontSize: 14, fontWeight: "700", color: colors.text },
  paymentDate: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  statusBadge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
});
