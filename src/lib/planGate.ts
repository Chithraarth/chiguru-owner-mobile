// What happens when the server refuses something because the Owner has no
// active plan (SUBSCRIPTION_REQUIRED) or not enough wallet credit for an AI
// feature (WALLET_EMPTY): one clear prompt with a button straight to the
// Subscription or Wallet screen. On a farm someone else invited you to, the
// plan and wallet are the owner's, so you're asked to contact them instead.
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { setGateErrorHandler } from "../api/client";
import { ApiError, isWalletEmpty } from "../api/errors";
import { getSubscription } from "../api/endpoints/subscription";
import { useEstateStore } from "../features/estate/store/estateStore";
import { useSessionStore } from "../store/sessionStore";
import { navigationRef } from "../navigation/navigationRef";

let lastPromptAt = 0;

function openOwnerScreen(screen: "Subscription" | "Wallet") {
  if (navigationRef.isReady()) navigationRef.navigate("DashboardTab", { screen });
}

export function showGatePrompt(err: ApiError) {
  // One action can fire several requests; never stack prompts.
  if (Date.now() - lastPromptAt < 3000) return;
  lastPromptAt = Date.now();

  const invited = useEstateStore.getState().activeRelationship === "invited";
  if (isWalletEmpty(err)) {
    const body = (err.body ?? {}) as { price?: number; balance?: number };
    const need = body.price != null ? `This needs ₹${body.price}` : "This AI feature needs wallet credit";
    const have = body.balance != null ? ` and the wallet has ₹${Math.floor(body.balance)}` : "";
    if (invited) {
      Alert.alert("Wallet balance too low", `${need}${have}. Ask the farm owner to recharge their Chiguru wallet.`);
      return;
    }
    Alert.alert("Wallet balance too low", `${need}${have}. Recharge your wallet to continue.`, [
      { text: "Not now", style: "cancel" },
      { text: "Recharge wallet", onPress: () => openOwnerScreen("Wallet") },
    ]);
    return;
  }

  if (invited) {
    Alert.alert("Farm owner's plan isn't active", "Ask the farm owner to renew their Chiguru plan to use this.");
    return;
  }
  Alert.alert("Subscription needed", "This feature needs an active Chiguru plan.", [
    { text: "Not now", style: "cancel" },
    { text: "See plans", onPress: () => openOwnerScreen("Subscription") },
  ]);
}

/** Mount once in the signed-in app. */
export function useGatePrompts() {
  useEffect(() => {
    setGateErrorHandler(showGatePrompt);
    return () => setGateErrorHandler(null);
  }, []);
}

const ACTIVE_STATUSES = new Set(["ACTIVE", "GRACE_PERIOD"]);
const storageKey = (uid: string) => `chiguru.planActive.${uid}`;

/**
 * Whether the signed-in Owner's plan is active: true/false once known, null
 * while unknown. The last answer is remembered on the device so an offline
 * start still locks paid screens - otherwise entries typed offline would be
 * refused (and lost) when they sync.
 */
export function usePlanActive(): boolean | null {
  const uid = useSessionStore((s) => s.user?.uid ?? null);
  const subQuery = useQuery({ queryKey: ["subscription"], queryFn: getSubscription, enabled: !!uid });
  const [remembered, setRemembered] = useState<boolean | null>(null);

  const live = subQuery.data ? ACTIVE_STATUSES.has(subQuery.data.subscription?.status ?? "") : null;

  useEffect(() => {
    if (!uid) return;
    if (live != null) {
      AsyncStorage.setItem(storageKey(uid), live ? "1" : "0").catch(() => {});
    } else {
      AsyncStorage.getItem(storageKey(uid))
        .then((v) => setRemembered(v == null ? null : v === "1"))
        .catch(() => {});
    }
  }, [uid, live]);

  return live ?? remembered;
}
