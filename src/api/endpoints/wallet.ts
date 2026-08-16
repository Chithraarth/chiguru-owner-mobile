import { apiFetch, apiMutate } from "../client";
import type {
  WalletMeResponse,
  WalletRechargeOrderResponse,
  WalletRechargeVerifyRequest,
  WalletRechargeVerifyResponse,
  WalletShareResponse,
} from "../../types/api";

export function getWallet() {
  return apiFetch<WalletMeResponse>("/wallet");
}

/** Step 1 of a recharge: create the Razorpay order the checkout WebView opens. */
export function createRechargeOrder(amount: number) {
  return apiMutate<WalletRechargeOrderResponse>("POST", "/wallet/recharge/order", { amount });
}

/** Step 2 of a recharge: verify the signature Razorpay's checkout returns, then credit the wallet. */
export function verifyRecharge(req: WalletRechargeVerifyRequest) {
  return apiMutate<WalletRechargeVerifyResponse>("POST", "/wallet/recharge/verify", req);
}

export function shareWalletReward(platform: string) {
  return apiMutate<WalletShareResponse>("POST", "/wallet/share", { platform });
}
