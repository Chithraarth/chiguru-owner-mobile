import "react-native-get-random-values";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
// @ts-expect-error - getReactNativePersistence exists at runtime but is not in the public TS types yet
import { getReactNativePersistence } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  initializeAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCredential,
  PhoneAuthProvider,
  GoogleAuthProvider,
  signOut,
  type User,
} from "firebase/auth";

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signOutUser() {
  return signOut(auth);
}

export function watchAuthState(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

// Phone-OTP sign-in: the send-OTP step (real reCAPTCHA) runs inside a
// WebView (see components/RecaptchaModal.tsx) which hands back a portable
// verificationId string. This finishes the sign-in natively using that id.
export function confirmPhoneOtp(verificationId: string, code: string) {
  const credential = PhoneAuthProvider.credential(verificationId, code);
  return signInWithCredential(auth, credential);
}

export function signInWithGoogleIdToken(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}
