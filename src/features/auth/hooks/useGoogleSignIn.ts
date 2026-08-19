import { useCallback } from "react";
import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";
import { signInWithGoogleIdToken } from "../../../lib/firebase";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const isGoogleSignInConfigured = !!webClientId;

if (isGoogleSignInConfigured) {
  // Native Google Sign-In SDK (not expo-auth-session's browser-redirect
  // flow) - the Android OAuth client Firebase auto-creates only supports
  // this native flow, not a custom-URI browser redirect. webClientId (not
  // the Android client id) is what's passed here; Google matches the
  // request to the Android client via this app's package name + SHA-1
  // registered in Cloud Console.
  GoogleSignin.configure({ webClientId, offlineAccess: false });
}

/**
 * Google Sign-In via the native Android SDK. Until
 * EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set, canSignIn stays false and the
 * caller should show a "not configured" message instead of prompting.
 */
export function useGoogleSignIn(onError: (message: string) => void) {
  const promptAsync = useCallback(async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return; // user cancelled
      const idToken = response.data.idToken;
      if (!idToken) {
        onError("Google didn't return a sign-in token. Please try again.");
        return;
      }
      await signInWithGoogleIdToken(idToken);
    } catch (err) {
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) return;
      onError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  }, [onError]);

  return { canSignIn: isGoogleSignInConfigured, promptAsync };
}
