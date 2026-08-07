import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Sprout, Eye, EyeOff } from "lucide-react-native";
import { RecaptchaModal, type RecaptchaModalHandle } from "../../../components/RecaptchaModal";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { colors, radius, spacing } from "../../../components/theme";
import {
  confirmPhoneOtp,
  firebaseConfig,
  signInWithEmail,
  signUpWithEmail,
} from "../../../lib/firebase";
import { useGoogleSignIn } from "../hooks/useGoogleSignIn";
import { useT } from "../../../lib/i18n";

type Tab = "email" | "phone";
type EmailMode = "signin" | "signup";

const COUNTRY_CODE = "+91";

// Firebase Auth error codes -> plain-language copy. Falls back to the raw
// (prefix-stripped) message for anything not mapped here, so unexpected
// errors are never silently swallowed.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/user-not-found": "No account found with this email. Check the email or create a new account.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/email-already-in-use": "An account already exists with this email. Try signing in instead.",
  "auth/weak-password": "Password should be at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a bit before trying again.",
  "auth/network-request-failed": "Network error. Check your internet connection and try again.",
  "auth/invalid-phone-number": "Enter a valid 10-digit mobile number.",
  "auth/missing-phone-number": "Enter your mobile number first.",
  "auth/invalid-verification-code": "That OTP doesn't look right. Please check and try again.",
  "auth/code-expired": "This OTP has expired. Tap \"Resend OTP\" to get a new one.",
  "auth/quota-exceeded": "Too many OTP requests right now. Please try again later.",
};

export function SignInScreen() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("email");
  const [emailMode, setEmailMode] = useState<EmailMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const recaptchaVerifier = useRef<RecaptchaModalHandle>(null);
  const { canSignIn: canGoogleSignIn, promptAsync: promptGoogle } = useGoogleSignIn(setError);

  function friendlyError(err: unknown): string {
    const code = (err as { code?: string } | null)?.code;
    if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];
    const msg = err instanceof Error ? err.message : "Something went wrong";
    return msg.replace(/^Firebase:\s*/, "").replace(/\s*\(auth\/[a-z-]+\)\.?$/, "");
  }

  async function handleEmailSubmit() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (emailMode === "signin") {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password);
        setInfo("Account created! Setting up your farm...");
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    setError(null);
    setInfo(null);
    const digits = phone.trim().replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      if (!recaptchaVerifier.current) throw new Error("Verifier not ready, try again");
      const normalized = `${COUNTRY_CODE}${digits}`;
      const id = await recaptchaVerifier.current.sendOtp(normalized);
      setVerificationId(id);
      setInfo(`OTP sent to ${COUNTRY_CODE} ${digits}`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!verificationId) return;
    setError(null);
    setInfo(null);
    if (otp.trim().length < 6) {
      setError("Enter the 6-digit OTP sent to your phone.");
      return;
    }
    setLoading(true);
    try {
      await confirmPhoneOtp(verificationId, otp.trim());
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!canGoogleSignIn) {
      setError("Google sign-in isn't configured yet - ask your admin to add a Google Client ID.");
      return;
    }
    setError(null);
    setInfo(null);
    await promptGoogle();
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Sprout size={26} color={colors.primary} />
          </View>

          <Text style={styles.heading}>
            {tab === "email" && emailMode === "signup" ? "Create your Chiguru account" : "Welcome back to Chiguru"}
          </Text>
          <Text style={styles.subheading}>
            {tab === "email" && emailMode === "signup"
              ? "Your farm data stays safe even if you lose your phone"
              : "Sign in to manage your farm"}
          </Text>

          <View style={styles.segmented}>
            <Pressable
              style={[styles.segment, tab === "email" && styles.segmentActive]}
              onPress={() => setTab("email")}
            >
              <Text style={[styles.segmentText, tab === "email" && styles.segmentTextActive]}>{t("profile.email")}</Text>
            </Pressable>
            <Pressable
              style={[styles.segment, tab === "phone" && styles.segmentActive]}
              onPress={() => setTab("phone")}
            >
              <Text style={[styles.segmentText, tab === "phone" && styles.segmentTextActive]}>Phone</Text>
            </Pressable>
          </View>

          {tab === "email" && (
            <>
              <TextField
                label={t("profile.email")}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TextField
                label="Password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                rightElement={
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textMuted} />
                    ) : (
                      <Eye size={18} color={colors.textMuted} />
                    )}
                  </Pressable>
                }
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {info ? <Text style={styles.info}>{info}</Text> : null}
              <Button
                title={emailMode === "signin" ? t("menu.signIn") : "Create account"}
                onPress={handleEmailSubmit}
                loading={loading}
              />
              <Text
                style={styles.link}
                onPress={() => {
                  setError(null);
                  setInfo(null);
                  setEmailMode(emailMode === "signin" ? "signup" : "signin");
                }}
              >
                {emailMode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
              </Text>
            </>
          )}

          {tab === "phone" && !verificationId && (
            <>
              <TextField
                label="Mobile number"
                keyboardType="phone-pad"
                maxLength={10}
                placeholder="98765 43210"
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))}
                leftElement={<Text style={styles.countryCode}>{COUNTRY_CODE}</Text>}
              />
              <RecaptchaModal
                ref={recaptchaVerifier}
                apiKey={firebaseConfig.apiKey ?? ""}
                authDomain={firebaseConfig.authDomain ?? ""}
                projectId={firebaseConfig.projectId ?? ""}
                appId={firebaseConfig.appId ?? ""}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {info ? <Text style={styles.info}>{info}</Text> : null}
              <Button title="Send OTP" onPress={handleSendOtp} loading={loading} disabled={phone.trim().length !== 10} />
            </>
          )}

          {tab === "phone" && verificationId && (
            <>
              <TextField
                label="Enter the OTP sent to your phone"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {info ? <Text style={styles.info}>{info}</Text> : null}
              <Button title="Verify" onPress={handleVerifyOtp} loading={loading} disabled={otp.trim().length !== 6} />
              <Text
                style={styles.link}
                onPress={() => {
                  setVerificationId(null);
                  setOtp("");
                  setError(null);
                  setInfo(null);
                }}
              >
                Wrong number? Go back
              </Text>
            </>
          )}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button title="Continue with Google" variant="secondary" onPress={handleGoogleSignIn} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  screen: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    alignSelf: "center",
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  heading: { fontSize: 19, fontWeight: "700", color: colors.text, textAlign: "center" },
  subheading: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.muted,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  segmentTextActive: { color: colors.text },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
  info: { color: colors.primary, marginBottom: spacing.md, fontSize: 13 },
  countryCode: { color: colors.text, fontSize: 16, fontWeight: "600", paddingRight: spacing.sm, borderRightWidth: 1, borderRightColor: colors.border },
  link: { color: colors.primary, textAlign: "center", marginTop: spacing.md, fontSize: 13, fontWeight: "600" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: spacing.sm, color: colors.textMuted, fontSize: 12 },
});
