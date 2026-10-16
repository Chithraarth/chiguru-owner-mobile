import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { signInWithAppleIdToken } from "../../../lib/firebase";

/**
 * Sign in with Apple (iPhone only). The App Store requires it alongside any
 * other third-party sign-in such as Google (guideline 4.8). Firebase signs
 * the person in with Apple's identity token, so the backend needs nothing
 * extra - it already accepts any Firebase sign-in provider.
 */
export function useAppleSignIn(onError: (message: string) => void) {
  const [canSignIn, setCanSignIn] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync().then(setCanSignIn).catch(() => setCanSignIn(false));
  }, []);

  const promptAsync = useCallback(async () => {
    try {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) {
        onError("Apple didn't return a sign-in token. Please try again.");
        return;
      }
      const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(" ");
      await signInWithAppleIdToken(credential.identityToken, rawNonce, name || null);
    } catch (err) {
      if ((err as { code?: string }).code === "ERR_REQUEST_CANCELED") return;
      onError(err instanceof Error ? err.message : "Apple sign-in failed");
    }
  }, [onError]);

  return { canSignIn, promptAsync };
}
