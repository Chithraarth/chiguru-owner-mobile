import { apiFetch, apiMutate } from "../client";
import type {
  AppleVerifyRequest,
  WalletMeResponse,
  WalletRechargeOrderResponse,
  WalletRechargeVerifyRequest,
  WalletRechargeVerifyResponse,
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


/** iPhone: verify a wallet-pack consumable bought through Apple and credit the wallet. */
export function verifyAppleWalletPack(req: AppleVerifyRequest) {
  return apiMutate<WalletRechargeVerifyResponse>("POST", "/wallet/apple/verify", req);
}
