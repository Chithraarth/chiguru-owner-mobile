// Apple In-App Purchase (iPhone only). Android keeps Google Play Billing and
// the web keeps Razorpay; on iOS every paid thing goes through StoreKit:
//   - plans: auto-renewable subscriptions (subscription_plans.apple_product_id)
//   - wallet packs and the extra invitee seat: consumables
// One app-wide listener (useApplePurchaseHandler, mounted in MainTabs) sends
// each StoreKit 2 signed transaction to the backend, which verifies Apple's
// signature before granting anything, and only then finishes the transaction.
// StoreKit re-delivers unfinished transactions on the next launch, so a
// purchase interrupted by a crash or lost signal still gets credited.
import { useEffect } from "react";
import { Alert, Platform } from "react-native";
import { create } from "zustand";
import { useQueryClient } from "@tanstack/react-query";
import {
  initConnection,
  endConnection,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  requestPurchase,
  getAvailablePurchases,
  deepLinkToSubscriptions,
  isUserCancelledError,
  type Purchase,
} from "react-native-iap";
import { verifyApplePurchase, verifyAppleSeatAddon } from "../../api/endpoints/subscription";
import { verifyAppleWalletPack } from "../../api/endpoints/wallet";
import { ApiError } from "../../api/errors";

export const isIOS = Platform.OS === "ios";

const WALLET_PACK_PREFIX = "com.thechiguru.owner.wallet.";
export const APPLE_SEAT_PRODUCT_ID = "com.thechiguru.owner.invitee_seat";

type Kind = "subscription" | "wallet" | "seat";
const kindOf = (productId: string): Kind =>
  productId.startsWith(WALLET_PACK_PREFIX) ? "wallet" : productId === APPLE_SEAT_PRODUCT_ID ? "seat" : "subscription";

/** Which purchase is in flight (Apple sheet open or verifying), for button spinners. */
export const useAppleIapStore = create<{ pendingSku: string | null; verifying: Kind | null }>(() => ({
  pendingSku: null,
  verifying: null,
}));
const setIap = useAppleIapStore.setState;

let connected: Promise<unknown> | null = null;
const ensureConnection = () => (connected ??= initConnection().catch((err) => { connected = null; throw err; }));

/** Opens Apple's purchase sheet. The result arrives in useApplePurchaseHandler's listener. */
export async function buyWithApple(sku: string) {
  setIap({ pendingSku: sku });
  try {
    await ensureConnection();
    await requestPurchase({ request: { apple: { sku } }, type: kindOf(sku) === "subscription" ? "subs" : "in-app" });
  } catch (err) {
    setIap({ pendingSku: null });
    if (!isUserCancelledError(err)) Alert.alert("Couldn't start purchase", "Please try again.");
  }
}

/** Re-sends this Apple ID's current subscription to the server (App Review requires a Restore button). */
export async function restoreApplePurchases(onDone: () => void) {
  try {
    await ensureConnection();
    const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
    const sub = purchases.find((p) => kindOf(p.productId) === "subscription" && p.purchaseToken);
    if (!sub) {
      Alert.alert("Nothing to restore", "No active Chiguru subscription was found for this Apple ID.");
      return;
    }
    await verifyApplePurchase({ signedTransaction: sub.purchaseToken! });
    onDone();
    Alert.alert("Purchases restored", "Your subscription is active on this account.");
  } catch (err) {
    Alert.alert("Couldn't restore", err instanceof ApiError ? err.message : "Please try again.");
  }
}

/** Apple subscriptions are cancelled from the Apple ID's own Subscriptions page. */
export function manageAppleSubscription() {
  deepLinkToSubscriptions({}).catch(() =>
    Alert.alert("Couldn't open Subscriptions", "Open Settings → your name → Subscriptions to manage this."),
  );
}

const DONE_MESSAGES: Record<Kind, [string, string]> = {
  subscription: ["Subscription active", "Your plan is now active."],
  wallet: ["Wallet recharged", "The credit has been added to your wallet."],
  seat: ["Invitee seat added", "You can now add one more invitee — this seat never expires."],
};

async function handlePurchase(purchase: Purchase, invalidate: () => void) {
  const jws = purchase.purchaseToken;
  if (!jws || !purchase.productId) return;
  const kind = kindOf(purchase.productId);
  setIap({ verifying: kind });
  try {
    const body = { signedTransaction: jws };
    const res =
      kind === "wallet" ? await verifyAppleWalletPack(body)
      : kind === "seat" ? await verifyAppleSeatAddon(body)
      : await verifyApplePurchase(body);
    if (!res) {
      // Offline: leave the transaction unfinished so StoreKit hands it back
      // next launch and it verifies then.
      Alert.alert("Payment received", "You're offline — this will finish once you're back online.");
      return;
    }
    await finishTransaction({ purchase, isConsumable: kind !== "subscription" });
    invalidate();
    Alert.alert(...DONE_MESSAGES[kind]);
  } catch (err) {
    // A purchase Apple says is refunded/expired, or already used by another
    // account, will never verify — finish it so it isn't re-sent forever.
    if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
      await finishTransaction({ purchase, isConsumable: kind !== "subscription" }).catch(() => {});
    }
    Alert.alert("Couldn't verify your payment", err instanceof ApiError ? err.message : "Please contact support if this keeps happening.");
  } finally {
    setIap({ verifying: null, pendingSku: null });
  }
}

/** Mount once, inside the signed-in Owner app. No-op on Android. */
export function useApplePurchaseHandler() {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!isIOS) return;
    const invalidate = () => {
      for (const key of ["subscription", "payments", "wallet"]) queryClient.invalidateQueries({ queryKey: [key] });
    };
    ensureConnection().catch((err: unknown) => console.warn("IAP initConnection failed", err));
    const updated = purchaseUpdatedListener((p) => void handlePurchase(p, invalidate));
    const failed = purchaseErrorListener(() => setIap({ pendingSku: null }));
    return () => {
      updated.remove();
      failed.remove();
      connected = null;
      endConnection();
    };
  }, [queryClient]);
}
