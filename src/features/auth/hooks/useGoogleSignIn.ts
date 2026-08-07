import { useEffect } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { signInWithGoogleIdToken } from "../../../lib/firebase";

WebBrowser.maybeCompleteAuthSession();

const realWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const realIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const realAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

export const isGoogleSignInConfigured = !!(realWebClientId || realIosClientId || realAndroidClientId);

// expo-auth-session's Google provider throws synchronously at hook-mount
// time (not just when prompting) if the client ID for the *current*
// platform is strictly `undefined` - an empty/unset env var isn't enough
// to make it fail gracefully. Feed it a harmless placeholder instead so the
// hook never crashes the screen; isGoogleSignInConfigured (checked against
// the real env vars) is what actually gates whether promptAsync is called.
const PLACEHOLDER = "not-configured.apps.googleusercontent.com";

/**
 * Google Sign-In via a native OAuth Client ID (Google Cloud Console), distinct
 * from the Firebase web config already in use elsewhere. Until one of the
 * EXPO_PUBLIC_GOOGLE_*_CLIENT_ID env vars is set, canSignIn stays false and
 * the caller should show a "not configured" message instead of prompting.
 */
export function useGoogleSignIn(onError: (message: string) => void) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: realWebClientId ?? PLACEHOLDER,
    iosClientId: realIosClientId ?? PLACEHOLDER,
    androidClientId: realAndroidClientId ?? PLACEHOLDER,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params.id_token;
      if (idToken) {
        signInWithGoogleIdToken(idToken).catch((err) =>
          onError(err instanceof Error ? err.message : "Google sign-in failed")
        );
      }
    } else if (response?.type === "error") {
      onError(response.error?.message ?? "Google sign-in was cancelled");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return { canSignIn: isGoogleSignInConfigured && !!request, promptAsync };
}
