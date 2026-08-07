import { apiFetch, apiMutate } from "../client";
import type {
  CheckoutResponse,
  Payment,
  ShareRewardResponse,
  SubscriptionPlansResponse,
  SubscriptionStatusResponse,
} from "../../types/api";

export function getPlans() {
  return apiFetch<SubscriptionPlansResponse>("/subscription/plans");
}

export function getSubscription() {
  return apiFetch<SubscriptionStatusResponse>("/subscription");
}

export function getPayments() {
  return apiFetch<Payment[]>("/payments");
}

export function checkoutPlan(planId: string) {
  return apiMutate<CheckoutResponse>("POST", "/subscription/checkout", { planId });
}

export function checkoutEstateAddon() {
  return apiMutate<CheckoutResponse>("POST", "/subscription/estate-addon/checkout");
}

export function checkoutDeviceAddon() {
  return apiMutate<CheckoutResponse>("POST", "/subscription/device-addon/checkout");
}

export function shareToEarn(platform: string) {
  return apiMutate<ShareRewardResponse>("POST", "/subscription/share", { platform });
}

export function cancelAutoRenew() {
  return apiMutate<{ ok: true }>("POST", "/subscription/cancel-autorenew");
}
