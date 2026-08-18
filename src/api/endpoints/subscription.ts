import { apiFetch, apiMutate } from "../client";
import type {
  ManagerSeatAddonOrderResponse,
  ManagerSeatAddonVerifyRequest,
  ManagerSeatAddonVerifyResponse,
  Payment,
  ShareRewardResponse,
  SubscriptionActionResponse,
  SubscriptionMeResponse,
  SubscriptionPlansResponse,
  VerifyAndroidPurchaseRequest,
} from "../../types/api";

export function getPlans() {
  return apiFetch<SubscriptionPlansResponse>("/subscriptions/plans");
}

export function getSubscription() {
  return apiFetch<SubscriptionMeResponse>("/subscriptions/me");
}

export function getPayments() {
  return apiFetch<Payment[]>("/payments");
}

/** purchaseToken comes from react-native-iap's purchase-updated listener after Play Billing's native purchase sheet completes. */
export function verifyAndroidPurchase(req: VerifyAndroidPurchaseRequest) {
  return apiMutate<SubscriptionActionResponse>("POST", "/subscriptions/android/verify", req);
}

export function shareToEarn(platform: string) {
  return apiMutate<ShareRewardResponse>("POST", "/subscriptions/share", { platform });
}

/**
 * Only meaningful for a subscription actually started through this screen
 * (provider RAZORPAY on web — never true for this Android app's own
 * purchases). For a Google Play subscription, the backend responds 409
 * MANAGE_VIA_GOOGLE_PLAY — the caller should catch that and deep-link to
 * Play Store's subscription management page instead.
 */
export function cancelSubscription() {
  return apiMutate<SubscriptionActionResponse>("POST", "/subscriptions/cancel");
}

/** Step 1 of a manager-seat add-on purchase: create the fixed-price Razorpay order the checkout WebView opens. */
export function createManagerSeatAddonOrder() {
  return apiMutate<ManagerSeatAddonOrderResponse>("POST", "/subscriptions/manager-seat-addon/order");
}

/** Step 2: verify the signature Razorpay's checkout returns, then permanently add +1 manager seat. */
export function verifyManagerSeatAddon(req: ManagerSeatAddonVerifyRequest) {
  return apiMutate<ManagerSeatAddonVerifyResponse>("POST", "/subscriptions/manager-seat-addon/verify", req);
}
