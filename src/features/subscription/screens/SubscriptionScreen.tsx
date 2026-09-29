import React, { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/Text";
import Constants from "expo-constants";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  initConnection,
  endConnection,
  requestPurchase,
  fetchProducts,
  purchaseUpdatedListener,
  finishTransaction,
  deepLinkToSubscriptions,
  isUserCancelledError,
  type Purchase,
  type ProductSubscriptionAndroid,
} from "react-native-iap";
import {
  Check,
  Crown,
  Lock,
  Sprout,
  Users,
} from "lucide-react-native";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { LoadingView } from "../../../components/StateViews";
import { colors, radius, spacing, shadow } from "../../../components/theme";
import {
  cancelSubscription,
  createManagerSeatAddonOrder,
  getPayments,
  getPlans,
  getSubscription,
  verifyAndroidPurchase,
  verifyManagerSeatAddon,
} from "../../../api/endpoints/subscription";
import { RazorpayCheckoutModal } from "../../wallet/components/RazorpayCheckoutModal";
import { ApiError } from "../../../api/errors";
import type { ManagerSeatAddonOrderResponse, SubscriptionPlan } from "../../../types/api";

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Google Play requires the app's own package name for deep-linking into its
// subscription management UI (react-native-iap v16's deepLinkToSubscriptions).
// Falls back to the value baked into app.json's `android.package` when the
// runtime config isn't available (e.g. certain release build configurations).
const ANDROID_PACKAGE_NAME = "com.thechiguru.owner";

function PlanIcon() {
  return <Sprout size={20} color={colors.primary} />;
}

export function SubscriptionScreen() {
  const queryClient = useQueryClient();
  const [purchasingPlanId, setPurchasingPlanId] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [seatAddonOrder, setSeatAddonOrder] = useState<ManagerSeatAddonOrderResponse | null>(null);
  const [seatAddonCheckoutVisible, setSeatAddonCheckoutVisible] = useState(false);
  const [buyingSeatAddon, setBuyingSeatAddon] = useState(false);
  const [verifyingSeatAddon, setVerifyingSeatAddon] = useState(false);
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
      const subs = await fetchProducts({ skus: productIds, type: "subs" });
      const tokenByProductId: Record<string, string> = {};
      for (const s of (subs ?? []) as ProductSubscriptionAndroid[]) {
        const offerToken = s.subscriptionOffers?.[0]?.offerTokenAndroid;
        if (offerToken) tokenByProductId[s.id] = offerToken;
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
      const purchaseToken = purchase.purchaseToken;
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
        deepLinkToSubscriptions({
          skuAndroid: productId ?? undefined,
          packageNameAndroid: Constants.expoConfig?.android?.package ?? ANDROID_PACKAGE_NAME,
        }).catch(() =>
          Alert.alert("Couldn't open Play Store", "Open the Play Store app and go to Subscriptions to manage this."),
        );
        return;
      }
      const msg = err instanceof ApiError ? err.message : "Please try again.";
      Alert.alert("Couldn't cancel", msg);
    },
  });

  if (plansQuery.isLoading || subQuery.isLoading) return <LoadingView label="Loading plans..." />;

  const current = subQuery.data?.subscription ?? null;
  const isActive = current?.status === "ACTIVE" || current?.status === "GRACE_PERIOD";

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
      await requestPurchase({
        request: {
          google: {
            skus: [plan.googlePlayProductId],
            subscriptionOffers: [{ sku: plan.googlePlayProductId, offerToken }],
          },
        },
        type: "subs",
      });
      // Result arrives via purchaseUpdatedListener above, not here.
    } catch (err) {
      setPurchasingPlanId(null);
      // User closing Play Billing's own sheet also lands here — not a real error.
      if (!isUserCancelledError(err)) {
        Alert.alert("Couldn't start purchase", "Please try again.");
      }
    }
  }

  async function onBuySeatAddon() {
    setBuyingSeatAddon(true);
    try {
      const created = await createManagerSeatAddonOrder();
      if (!created) {
        Alert.alert("You're offline", "Connect to the internet to buy an extra invitee seat.");
        setBuyingSeatAddon(false);
        return;
      }
      setSeatAddonOrder(created);
      setSeatAddonCheckoutVisible(true);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Please try again.";
      Alert.alert("Couldn't start checkout", msg);
      setBuyingSeatAddon(false);
    }
  }

  async function onSeatAddonCheckoutSuccess(result: { paymentId: string; orderId: string; signature: string }) {
    setSeatAddonCheckoutVisible(false);
    setVerifyingSeatAddon(true);
    try {
      const res = await verifyManagerSeatAddon({
        orderId: result.orderId,
        paymentId: result.paymentId,
        signature: result.signature,
      });
      if (!res) {
        Alert.alert("Payment received", "You're offline — this will finish activating once you're back online.");
        return;
      }
      invalidateAll();
      Alert.alert("Invitee seat added", "You can now add one more invitee — this seat never expires.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Please contact support if this keeps happening.";
      Alert.alert("Couldn't verify your payment", msg);
    } finally {
      setVerifyingSeatAddon(false);
      setBuyingSeatAddon(false);
      setSeatAddonOrder(null);
    }
  }

  function onSeatAddonCheckoutDismiss() {
    setSeatAddonCheckoutVisible(false);
    setBuyingSeatAddon(false);
    setSeatAddonOrder(null);
  }

  function onSeatAddonCheckoutError(message: string) {
    setSeatAddonCheckoutVisible(false);
    setBuyingSeatAddon(false);
    setSeatAddonOrder(null);
    Alert.alert("Payment failed", message);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: spacing.xl }}>
      {isActive ? (
        <View style={styles.statusCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Crown size={18} color={colors.accentInk} />
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
          {subQuery.data ? (
            <View style={styles.seatRow}>
              <Users size={14} color={colors.accentInk} />
              <Text style={styles.seatText}>
                {subQuery.data.entitlement.managersUsed}/{subQuery.data.entitlement.managerLimit} invitees used
                {" · "}
                {subQuery.data.entitlement.remainingManagers} remaining
                {subQuery.data.entitlement.extraManagerSeats ? ` (includes ${subQuery.data.entitlement.extraManagerSeats} purchased)` : ""}
              </Text>
            </View>
          ) : null}
          <View style={{ marginTop: spacing.sm }}>
            <Button
              title={`Add extra invitee seat — ${inr(subQuery.data?.entitlement.managerSeatAddonPrice ?? 99)} one-time`}
              variant="secondary"
              onPress={onBuySeatAddon}
              loading={buyingSeatAddon && !seatAddonCheckoutVisible}
              disabled={buyingSeatAddon}
            />
          </View>
        </View>
      ) : (
        <View style={styles.statusCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Lock size={18} color={colors.accentInk} />
            <Text style={styles.statusTitle}>Subscribe to unlock</Text>
          </View>
          <Text style={styles.statusDesc}>Subscribe below to run your whole farm and add invitees.</Text>
        </View>
      )}

      {verifying ? (
        <Card style={{ backgroundColor: "#FFF8E6", borderColor: "#F0DFA6" }}>
          <Text style={{ color: "#8A6D1D", fontSize: 14.5 }}>Payment received. Verifying your subscription...</Text>
        </Card>
      ) : null}

      {verifyingSeatAddon ? (
        <Card style={{ backgroundColor: "#FFF8E6", borderColor: "#F0DFA6" }}>
          <Text style={{ color: "#8A6D1D", fontSize: 14.5 }}>Payment received. Verifying your invitee seat...</Text>
        </Card>
      ) : null}

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
              <Text style={styles.planPerMonth}>per {plan.billingPeriod === "yearly" ? "year" : plan.billingPeriod === "monthly" ? "month" : plan.billingPeriod}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm }}>
                <Check size={13} color={colors.primary} />
                <Text style={styles.planFeature}>{plan.managerLimit} invitee{plan.managerLimit > 1 ? "s" : ""} included</Text>
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
                <View style={[styles.statusBadge, p.paymentStatus === "succeeded" ? { backgroundColor: "#FBF2D9" } : { backgroundColor: "#FDEAEA" }]}>
                  <Text style={[styles.statusBadgeText, { color: p.paymentStatus === "succeeded" ? colors.primary : colors.danger }]}>{p.paymentStatus}</Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>

      <RazorpayCheckoutModal
        visible={seatAddonCheckoutVisible}
        order={seatAddonOrder}
        description="Extra invitee seat (one-time)"
        onSuccess={onSeatAddonCheckoutSuccess}
        onDismiss={onSeatAddonCheckoutDismiss}
        onError={onSeatAddonCheckoutError}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  statusCard: { backgroundColor: colors.accent, borderRadius: 28, padding: 18 },
  statusTitle: { color: colors.accentInk, fontSize: 20, fontWeight: "800" },
  statusDesc: { color: colors.accentInkSoft, fontSize: 15, marginTop: spacing.xs, lineHeight: 21 },
  statusMeta: { color: colors.accentInkSoft, fontSize: 14, marginTop: spacing.sm },
  seatRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: "rgba(58,42,0,0.15)" },
  seatText: { color: colors.accentInk, fontSize: 15, fontWeight: "700", flex: 1 },

  honestCard: { backgroundColor: colors.card, borderRadius: 28, padding: 18, alignItems: "center", ...shadow },
  honestTitle: { fontSize: 16, fontWeight: "700", color: colors.primary, textAlign: "center" },
  honestDesc: { fontSize: 14, color: colors.primary, opacity: 0.8, marginTop: spacing.xs, textAlign: "center", lineHeight: 16 },

  planCardCurrent: { borderColor: colors.primary, backgroundColor: "#FBF2D9" },
  planIconWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#FFD166", alignItems: "center", justifyContent: "center" },
  planName: { fontSize: 16.5, fontWeight: "700", color: colors.text },
  planTagline: { fontSize: 13.5, color: colors.textMuted, marginTop: 1 },
  planPrice: { fontSize: 26, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
  planPerMonth: { fontSize: 14, color: colors.textMuted },
  planFeature: { fontSize: 14, color: colors.text, flex: 1 },

  sectionTitle: { fontSize: 20, fontWeight: "800", color: colors.text },

  whyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  whyText: { fontSize: 14, color: colors.text, lineHeight: 17 },

  emptyText: { fontSize: 14.5, color: colors.textMuted },
  paymentAmount: { fontSize: 15.5, fontWeight: "700", color: colors.text },
  paymentDate: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  statusBadge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
});
