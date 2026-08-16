import { apiFetch, apiMutate } from "../client";
import type {
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
