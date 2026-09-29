import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, TextInput } from "../../../components/Text";
import { ArrowRight, Check, ChevronLeft, Eye, EyeOff, Mail, Phone } from "lucide-react-native";
import { Logo } from "../../../components/Logo";
import { RoundButton } from "../../../components/harvest";
import { Enter, LivingHills, Wiggle, useReducedMotion } from "../../../components/motion";
import { RecaptchaModal, type RecaptchaModalHandle } from "../../../components/RecaptchaModal";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";
import { colors, radius, shadow, spacing } from "../../../components/theme";
import {
  confirmPhoneOtp,
  firebaseConfig,
  signInWithEmail,
  signUpWithEmail,
} from "../../../lib/firebase";
import { useGoogleSignIn } from "../hooks/useGoogleSignIn";
import { useT } from "../../../lib/i18n";

type Tab = "email" | "phone";

const RESEND_SECONDS = 30;
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
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("phone");
  const [emailMode, setEmailMode] = useState<EmailMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const recaptchaVerifier = useRef<RecaptchaModalHandle>(null);
  const { canSignIn: canGoogleSignIn, promptAsync: promptGoogle } = useGoogleSignIn(setError);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  function friendlyError(err: unknown): string {
    const code = (err as { code?: string } | null)?.code;
    if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];
    const msg = err instanceof Error ? err.message : "Something went wrong";
    return msg.replace(/^Firebase:\s*/, "").replace(/\s*\(auth\/[a-z-]+\)\.?$/, "");
  }

  function clearMessages() {
    setError(null);
    setInfo(null);
  }

  async function handleEmailSubmit() {
    clearMessages();
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
    clearMessages();
    const digits = phone.trim().replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      if (!recaptchaVerifier.current) throw new Error("Verifier not ready, try again");
      const id = await recaptchaVerifier.current.sendOtp(`${COUNTRY_CODE}${digits}`);
      setVerificationId(id);
      setOtp("");
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!verificationId) return;
    clearMessages();
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
    clearMessages();
    await promptGoogle();
  }

  function changeNumber() {
    setVerificationId(null);
    setOtp("");
    clearMessages();
  }

  function switchTab(next: Tab) {
    clearMessages();
    setTab(next);
  }

  const messages = (
    <>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {info ? <Text style={styles.info}>{info}</Text> : null}
    </>
  );

  const recaptcha = (
    <RecaptchaModal
      ref={recaptchaVerifier}
      apiKey={firebaseConfig.apiKey ?? ""}
      authDomain={firebaseConfig.authDomain ?? ""}
      projectId={firebaseConfig.projectId ?? ""}
      appId={firebaseConfig.appId ?? ""}
    />
  );

  // ── OTP step ────────────────────────────────────────────────────────────
  if (tab === "phone" && verificationId) {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Enter kind="down" style={[styles.otpBand, { paddingTop: insets.top + 12 }]}>
          <RoundButton icon={ChevronLeft} label="Change number" onPress={changeNumber} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bandSub}>
              OTP sent to {COUNTRY_CODE} {phone}
            </Text>
            <Text style={styles.bandTitle}>Enter the code</Text>
          </View>
        </Enter>
        <ScrollView contentContainerStyle={styles.otpBody} keyboardShouldPersistTaps="handled">
          <Enter delay={250}>
            <OtpBoxes value={otp} onChange={setOtp} />
          </Enter>
          <Enter delay={400} style={styles.resendRow}>
            <Text style={styles.muted}>Didn’t get it?</Text>
            {resendIn > 0 ? (
              <Text style={styles.resendWait}>Resend in 0:{String(resendIn).padStart(2, "0")}</Text>
            ) : (
              <Text style={styles.link} onPress={handleSendOtp}>
                Resend OTP
              </Text>
            )}
          </Enter>
          {messages}
          <Enter delay={520}>
            <Button title="Verify & continue" icon={Check} onPress={handleVerifyOtp} loading={loading} disabled={otp.trim().length !== 6} />
          </Enter>
          <Enter delay={620}>
            <Text style={[styles.link, { textAlign: "center" }]} onPress={changeNumber}>
              Change number
            </Text>
          </Enter>
        </ScrollView>
        {recaptcha}
      </KeyboardAvoidingView>
    );
  }

  const isEmail = tab === "email";

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <Enter kind="down" style={[styles.band, { paddingTop: insets.top + 24, height: (isEmail ? 250 : 290) + insets.top }]}>
          <LivingHills height={isEmail ? 140 : 150} />
          {isEmail ? (
            <>
              <RoundButton icon={ChevronLeft} label="Back to mobile sign-in" onPress={() => switchTab("phone")} />
              <Enter delay={350}>
                <Text style={[styles.greet, { marginTop: 18 }]}>Email sign-in</Text>
              </Enter>
            </>
          ) : (
            <>
              <Enter kind="pop" delay={300}>
                <Logo size={64} />
              </Enter>
              <Enter delay={450} style={{ alignSelf: "flex-start", marginTop: 14 }}>
                <Wiggle style={{ transformOrigin: "left bottom" }}>
                  <Text style={styles.greet}>नमस्कार!</Text>
                </Wiggle>
              </Enter>
            </>
          )}
        </Enter>

        <Enter delay={300} style={styles.cardWrap}>
          <View style={styles.card}>
            {isEmail ? (
              <>
                <View style={styles.segmented}>
                  {(["signin", "signup"] as const).map((m) => (
                    <Pressable
                      key={m}
                      style={[styles.segment, emailMode === m && styles.segmentActive]}
                      onPress={() => {
                        clearMessages();
                        setEmailMode(m);
                      }}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: emailMode === m }}
                    >
                      <Text style={[styles.segmentText, emailMode === m && styles.segmentTextActive]}>
                        {m === "signin" ? t("menu.signIn") : "Create account"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <TextField label={t("profile.email")} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
                <TextField
                  label="Password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  rightElement={
                    <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10} accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
                    </Pressable>
                  }
                />
                {messages}
                <Button title={emailMode === "signin" ? t("menu.signIn") : "Create account"} icon={ArrowRight} onPress={handleEmailSubmit} loading={loading} />
                <Button title="Use mobile number instead" variant="light" icon={Phone} onPress={() => switchTab("phone")} />
              </>
            ) : (
              <>
                <Text style={styles.heading}>Sign in</Text>
                <Text style={styles.subheading}>Use the mobile number you farm with.</Text>
                <TextField
                  label="Mobile number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholder="98765 43210"
                  value={phone}
                  onChangeText={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))}
                  leftElement={<Text style={styles.countryCode}>{COUNTRY_CODE}</Text>}
                />
                {messages}
                <Button title="Send OTP" icon={ArrowRight} onPress={handleSendOtp} loading={loading} disabled={phone.trim().length !== 10} />
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>
                <Button title="Continue with Google" variant="secondary" onPress={handleGoogleSignIn} />
                <Button title="Use email instead" variant="light" icon={Mail} onPress={() => switchTab("email")} />
              </>
            )}
          </View>
        </Enter>
      </ScrollView>
      {recaptcha}
    </KeyboardAvoidingView>
  );
}

/** Six digit boxes over one hidden input; the next empty box blinks green like a cursor. */
function OtpBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<any>(null);
  const reduced = useReducedMotion();
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0, duration: 500, useNativeDriver: false }),
        Animated.timing(blink, { toValue: 1, duration: 500, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [blink, reduced]);
  const activeBorder = blink.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.primary] });

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.otpRow} accessibilityLabel="Enter the 6-digit code">
      {Array.from({ length: 6 }, (_, i) => {
        const digit = value[i] ?? "";
        const active = i === value.length;
        return (
          <Enter key={i} kind="pop" delay={300 + i * 80}>
            <Animated.View style={[styles.otpBox, active && { borderColor: activeBorder }]}>
              <Text style={styles.otpDigit}>{digit}</Text>
            </Animated.View>
          </Enter>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        autoFocus
        style={styles.hiddenInput}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  band: {
    backgroundColor: colors.accent,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  greet: { fontSize: 32, fontWeight: "800", color: colors.accentInk, lineHeight: 40 },
  cardWrap: { marginTop: -40, paddingHorizontal: 20 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 20, gap: 14, ...shadow },
  heading: { fontSize: 26, fontWeight: "800", color: colors.text, lineHeight: 30 },
  subheading: { fontSize: 16.5, color: colors.textMuted, marginTop: -8 },
  segmented: { flexDirection: "row", backgroundColor: colors.muted, borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, minHeight: 46, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: colors.card },
  segmentText: { fontSize: 16, fontWeight: "700", color: colors.textMuted },
  segmentTextActive: { color: colors.text, fontWeight: "800" },
  error: { color: colors.danger, fontSize: 14.5, fontWeight: "600" },
  info: { color: colors.primary, fontSize: 14.5, fontWeight: "600" },
  countryCode: { color: colors.text, fontSize: 17, fontWeight: "700" },
  link: { color: colors.primary, fontSize: 15, fontWeight: "800" },
  muted: { color: colors.textMuted, fontSize: 15 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#D8D0BC" },
  dividerText: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
  otpBand: {
    backgroundColor: colors.accent,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bandSub: { fontSize: 14, fontWeight: "600", color: colors.accentInkSoft },
  bandTitle: { fontSize: 26, fontWeight: "800", color: colors.accentInk, lineHeight: 32 },
  otpBody: { padding: 20, paddingTop: 24, gap: 22 },
  otpRow: { flexDirection: "row", justifyContent: "space-between" },
  otpBox: {
    width: 50,
    height: 60,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  otpDigit: { fontSize: 26, fontWeight: "800", color: colors.text },
  hiddenInput: { position: "absolute", opacity: 0, width: 1, height: 1 },
  resendRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resendWait: { fontSize: 15, fontWeight: "700", color: colors.text },
});
